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

function centroidOfPolygon(coords: number[][]): { lat: number; lng: number } {
  // coords: [ [lon, lat], ... ]
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [x1, y1] = coords[j];
    const [x2, y2] = coords[i];
    const f = x1 * y2 - x2 * y1;
    area += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  area *= 0.5;
  if (area === 0) return { lat: coords[0][1], lng: coords[0][0] };
  return { lng: cx / (6 * area), lat: cy / (6 * area) };
}

function centroidOfGeoJSON(geojson: any): { lat: number; lng: number } | null {
  try {
    if (!geojson) return null;
    if (geojson.type === 'Polygon') {
      const ring = geojson.coordinates[0];
      return centroidOfPolygon(ring);
    }
    if (geojson.type === 'MultiPolygon') {
      // Take first polygon for simplicity
      const ring = geojson.coordinates[0][0];
      return centroidOfPolygon(ring);
    }
    return null;
  } catch (_) {
    return null;
  }
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

    // Build query string for Nominatim - more specific for building-level accuracy
    // Format: house number first, then street for better building matching
    const query = `${houseNumber} ${street}, ${postalCode} ${city}, Germany`;
    const encodedQuery = encodeURIComponent(query);

    // Use Nominatim API with building-specific parameters for rooftop precision
    // polygon_geojson=1: Get building polygon geometry for centroid calculation
    // addressdetails=1: Get detailed address components
    // layer=address: Force address-level results (not street/area)
    // featuretype=house: Prioritize house/building results
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1&polygon_geojson=1&layer=address&featuretype=house`;

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
    // Prefer polygon centroid when available for rooftop precision
    let coordinates = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    if (result.geojson) {
      const centroid = centroidOfGeoJSON(result.geojson);
      if (centroid) {
        coordinates = centroid;
      }
    }

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