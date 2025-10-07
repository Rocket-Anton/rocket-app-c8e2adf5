import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { street, houseNumber, postalCode, city } = await req.json() as GeocodeRequest;

    console.log('Geocoding address:', { street, houseNumber, postalCode, city });

    // Build query string for Nominatim
    const query = `${street} ${houseNumber}, ${postalCode} ${city}, Germany`;
    const encodedQuery = encodeURIComponent(query);

    // Use Nominatim API (OpenStreetMap) - Free and no API key required
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;

    console.log('Calling Nominatim API:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'LauflistenApp/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Nominatim response:', data);

    if (!data || data.length === 0) {
      console.error('No results found for address');
      return new Response(
        JSON.stringify({ 
          error: 'Address not found',
          coordinates: null 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = data[0];
    const coordinates = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };

    console.log('Geocoded coordinates:', coordinates);

    return new Response(
      JSON.stringify({ 
        coordinates,
        displayName: result.display_name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in geocode-address function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});