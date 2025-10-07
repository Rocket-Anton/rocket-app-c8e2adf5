import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all data using service role (bypasses RLS)
    await supabase.from('lauflisten_addresses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lauflisten').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('addresses').delete().neq('id', 0);

    // Get current user for created_by
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Define addresses to create
    const addresses = [
      { street: 'Am Pfarracker', house_number: '33 A', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '33 B', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '35', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '37 B', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '33', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '37', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '37 C', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '35 B', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '37 A', postal_code: '33619', city: 'Bielefeld' },
      { street: 'Am Pfarracker', house_number: '35 A', postal_code: '33619', city: 'Bielefeld' },
    ];

    console.log('Creating addresses with temporary coordinates, then geocoding...');
    
    // Step 1: Create all addresses with Bielefeld center as temporary coordinates
    const bielefeldCenter = { lat: 52.0302, lng: 8.5325 };
    const insertedAddresses = [];
    
    for (const addr of addresses) {
      try {
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            ...addr,
            coordinates: bielefeldCenter,
            units: [{ status: 'nicht_bearbeitet' }],
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to insert ${addr.street} ${addr.house_number}:`, error);
          continue;
        }
        
        insertedAddresses.push(data);
        console.log(`Inserted ${addr.street} ${addr.house_number} with ID ${data.id}`);
      } catch (err: any) {
        console.error(`Error inserting ${addr.street} ${addr.house_number}:`, err.message);
      }
    }

    // Step 2: Geocode and update each address (in background)
    const geocodePromises = insertedAddresses.map(async (address) => {
      try {
        console.log(`Geocoding ${address.street} ${address.house_number}...`);
        
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
          body: {
            street: address.street,
            houseNumber: address.house_number,
            postalCode: address.postal_code,
            city: address.city,
          },
        });

        if (geocodeError || !geocodeData?.coordinates) {
          console.error(`Geocoding failed for ${address.street} ${address.house_number}:`, geocodeError);
          return;
        }

        console.log(`Got coordinates for ${address.street} ${address.house_number}:`, geocodeData.coordinates);

        // Update address with real coordinates
        const { error: updateError } = await supabase
          .from('addresses')
          .update({ coordinates: geocodeData.coordinates })
          .eq('id', address.id);

        if (updateError) {
          console.error(`Failed to update coordinates for ${address.street} ${address.house_number}:`, updateError);
        } else {
          console.log(`Successfully updated coordinates for ${address.street} ${address.house_number}`);
        }
      } catch (err: any) {
        console.error(`Error geocoding ${address.street} ${address.house_number}:`, err.message);
      }
    });

    // Wait for all geocoding to complete (with timeout)
    await Promise.race([
      Promise.all(geocodePromises),
      new Promise(resolve => setTimeout(resolve, 30000)) // 30s timeout
    ]);

    console.log(`Reset complete: ${insertedAddresses.length} addresses created`);

    return new Response(JSON.stringify({ 
      success: true, 
      addresses: insertedAddresses,
      message: `${insertedAddresses.length} Adressen erstellt und werden geocoded...`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in reset-addresses:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
