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

    // Geocode each address and insert
    const insertedAddresses = [];
    
    for (const addr of addresses) {
      try {
        // Call geocode function
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
          body: {
            street: addr.street,
            houseNumber: addr.house_number,
            postalCode: addr.postal_code,
            city: addr.city,
          },
        });

        let coordinates = { lat: 52.0302, lng: 8.5325 }; // Fallback
        
        if (!geocodeError && geocodeData?.coordinates) {
          coordinates = geocodeData.coordinates;
          console.log(`Geocoded ${addr.street} ${addr.house_number}:`, coordinates);
        } else {
          console.error(`Geocoding failed for ${addr.street} ${addr.house_number}:`, geocodeError);
        }

        // Insert address with geocoded coordinates
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

        if (error) throw error;
        insertedAddresses.push(data);
        
      } catch (err: any) {
        console.error(`Error processing ${addr.street} ${addr.house_number}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, addresses: insertedAddresses }), {
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
