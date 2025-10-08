import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  street: string;
  houseNumber: string;
  postalCode?: string;
  city?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { street, houseNumber, postalCode, city }: GeocodeRequest = await req.json();
    
    // Get Mapbox access token from environment
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!MAPBOX_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    }

    // Build search query
    const addressParts = [
      `${street} ${houseNumber}`,
      postalCode,
      city,
      'Deutschland'
    ].filter(Boolean);
    
    const searchText = addressParts.join(', ');
    const encodedSearch = encodeURIComponent(searchText);
    
    // Call Mapbox Geocoding API
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedSearch}.json?access_token=${MAPBOX_TOKEN}&country=DE&types=address&limit=1`;
    
    console.log(`Geocoding: ${searchText}`);
    
    const response = await fetch(mapboxUrl);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      // Fallback: Try without house number
      const fallbackSearch = [street, postalCode, city, 'Deutschland'].filter(Boolean).join(', ');
      const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fallbackSearch)}.json?access_token=${MAPBOX_TOKEN}&country=DE&limit=1`;
      
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.features && fallbackData.features.length > 0) {
        const feature = fallbackData.features[0];
        return new Response(
          JSON.stringify({
            lat: feature.center[1],
            lng: feature.center[0],
            source: 'mapbox_street',
            accuracy: 'street',
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error('Address not found');
    }
    
    const feature = data.features[0];
    
    return new Response(
      JSON.stringify({
        lat: feature.center[1],
        lng: feature.center[0],
        source: 'mapbox',
        accuracy: feature.accuracy || 'rooftop',
        place_name: feature.place_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error('Geocoding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        lat: null,
        lng: null,
      }),
      { 
        status: 200, // Return 200 to not break the import flow
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
