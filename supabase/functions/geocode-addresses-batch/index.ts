import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listId } = await req.json();
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'Missing listId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Geocode Batch] Starting for list ${listId}`);

    // Load list
    const { data: list, error: listError } = await supabase
      .from('project_address_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      console.error('[Geocode Batch] List not found:', listError);
      return new Response(
        JSON.stringify({ error: 'List not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load addresses without coordinates (batch of 50)
    const { data: addresses, error: addressError } = await supabase
      .from('addresses')
      .select('id, street, house_number, postal_code, city, coordinates')
      .eq('list_id', listId)
      .or('coordinates->lat.is.null,coordinates->lng.is.null')
      .limit(50);

    if (addressError) {
      console.error('[Geocode Batch] Error loading addresses:', addressError);
      throw addressError;
    }

    if (!addresses || addresses.length === 0) {
      // No more addresses to geocode - mark as completed
      console.log(`[Geocode Batch] All addresses geocoded for list ${listId}`);
      
      await supabase
        .from('project_address_lists')
        .update({
          status: 'completed',
          last_progress_at: new Date().toISOString(),
        })
        .eq('id', listId);

      return new Response(
        JSON.stringify({ success: true, message: 'Geocoding completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Geocode Batch] Geocoding ${addresses.length} addresses`);

    // Geocode in parallel (batch of 50)
    const geocodePromises = addresses.map(async (addr) => {
      try {
        const query = `${addr.street} ${addr.house_number}, ${addr.postal_code} ${addr.city}, Germany`;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=DE&limit=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          
          // Update address with coordinates
          await supabase
            .from('addresses')
            .update({ coordinates: { lat, lng } })
            .eq('id', addr.id);
          
          return { success: true, addressId: addr.id };
        } else {
          // Geocoding failed - add to error_details
          return {
            success: false,
            addressId: addr.id,
            error: {
              address: `${addr.street} ${addr.house_number}, ${addr.postal_code} ${addr.city}`,
              reason: 'Geocoding fehlgeschlagen: Keine Koordinaten gefunden',
              type: 'geocoding'
            }
          };
        }
      } catch (error) {
        console.error(`[Geocode Batch] Error geocoding address ${addr.id}:`, error);
        return {
          success: false,
          addressId: addr.id,
          error: {
            address: `${addr.street} ${addr.house_number}, ${addr.postal_code} ${addr.city}`,
            reason: `Geocoding fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
            type: 'geocoding'
          }
        };
      }
    });

    const results = await Promise.all(geocodePromises);
    const successCount = results.filter(r => r.success).length;
    const failedResults = results.filter(r => !r.success);

    console.log(`[Geocode Batch] Geocoded ${successCount}/${results.length} addresses`);

    // Update error_details with failed geocoding attempts
    if (failedResults.length > 0) {
      const existingErrors = (list.error_details as any)?.failedAddresses || [];
      const newErrors = failedResults.map(r => r.error);
      
      await supabase
        .from('project_address_lists')
        .update({
          error_details: {
            failedAddresses: [...existingErrors, ...newErrors]
          },
          last_progress_at: new Date().toISOString(),
        })
        .eq('id', listId);
    } else {
      await supabase
        .from('project_address_lists')
        .update({
          last_progress_at: new Date().toISOString(),
        })
        .eq('id', listId);
    }

    // Check if there are more addresses to geocode
    const { count } = await supabase
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId)
      .or('coordinates->lat.is.null,coordinates->lng.is.null');

    if (count && count > 0) {
      // More addresses to geocode - trigger continuation
      console.log(`[Geocode Batch] ${count} addresses remaining, scheduling continuation`);
      
      // Self-invoke for next batch
      fetch(`${supabaseUrl}/functions/v1/geocode-addresses-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ listId }),
      }).catch(err => console.error('[Geocode Batch] Error scheduling continuation:', err));

      return new Response(
        JSON.stringify({ success: true, message: 'Batch geocoded, continuation scheduled', remaining: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // All done - mark as completed
      console.log(`[Geocode Batch] All addresses geocoded for list ${listId}`);
      
      await supabase
        .from('project_address_lists')
        .update({
          status: 'completed',
          last_progress_at: new Date().toISOString(),
        })
        .eq('id', listId);

      return new Response(
        JSON.stringify({ success: true, message: 'All addresses geocoded successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[Geocode Batch] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
