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

    console.log('Reset: geocoding each address BEFORE insert (no placeholders).');
    
    const insertedAddresses: any[] = [];
    
    for (const addr of addresses) {
      try {
        console.log(`Geocoding ${addr.street} ${addr.house_number}...`);
        
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
          body: {
            street: addr.street,
            houseNumber: addr.house_number,
            postalCode: addr.postal_code,
            city: addr.city,
          },
        });

        if (geocodeError || !geocodeData?.coordinates ||
            typeof geocodeData.coordinates.lat !== 'number' ||
            typeof geocodeData.coordinates.lng !== 'number') {
          console.error(`Geocoding failed or invalid for ${addr.street} ${addr.house_number}:`, geocodeError || geocodeData);
          continue; // strictly skip if not geocoded
        }

        const coordinates = geocodeData.coordinates;
        console.log(`Got coordinates for ${addr.street} ${addr.house_number}:`, coordinates);

        // Insert address with real geocoded coordinates
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            ...addr,
            coordinates,
            units: [{ status: 'nicht_bearbeitet' }],
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error(`Database insert failed for ${addr.street} ${addr.house_number}:`, error);
          continue;
        }
        
        insertedAddresses.push(data);
        console.log(`Successfully inserted ${addr.street} ${addr.house_number}`);
        
      } catch (err: any) {
        console.error(`Error processing ${addr.street} ${addr.house_number}:`, err.message);
      }
    }

    console.log(`Reset complete: ${insertedAddresses.length} addresses inserted with real coordinates`);

    return new Response(JSON.stringify({ 
      success: true, 
      addresses: insertedAddresses,
      message: `${insertedAddresses.length} Adressen erfolgreich mit echten Koordinaten eingefügt`
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
