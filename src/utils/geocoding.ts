import { supabase } from "@/integrations/supabase/client";

interface GeocodeResult {
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  displayName?: string;
  error?: string;
}

export async function geocodeAddress(
  street: string,
  houseNumber: string,
  postalCode: string,
  city: string
): Promise<GeocodeResult> {
  try {
    console.log('Geocoding address:', { street, houseNumber, postalCode, city });

    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: {
        street,
        houseNumber,
        postalCode,
        city
      }
    });

    if (error) {
      console.error('Geocoding error:', error);
      return { coordinates: null, error: error.message };
    }

    if (data.error) {
      console.error('Geocoding API error:', data.error);
      return { coordinates: null, error: data.error };
    }

    console.log('Geocoding success:', data);
    return {
      coordinates: data.coordinates,
      displayName: data.displayName
    };
  } catch (error) {
    console.error('Geocoding exception:', error);
    return {
      coordinates: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to check if coordinates are valid
export function hasValidCoordinates(coordinates: [number, number] | { lat: number; lng: number } | null): boolean {
  if (!coordinates) return false;
  
  if (Array.isArray(coordinates)) {
    return coordinates[0] !== 0 && coordinates[1] !== 0;
  }
  
  return coordinates.lat !== 0 && coordinates.lng !== 0;
}

// Batch geocode addresses with delay to respect rate limits
export async function geocodeAddressesBatch(
  addresses: Array<{
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    coordinates?: [number, number];
  }>
): Promise<Array<{ lat: number; lng: number } | null>> {
  const results: Array<{ lat: number; lng: number } | null> = [];
  
  for (const address of addresses) {
    // Skip if already has valid coordinates
    if (address.coordinates && hasValidCoordinates(address.coordinates)) {
      results.push({
        lng: address.coordinates[0],
        lat: address.coordinates[1]
      });
      continue;
    }

    const result = await geocodeAddress(
      address.street,
      address.houseNumber,
      address.postalCode,
      address.city
    );

    results.push(result.coordinates);

    // Wait 1 second between requests to respect Nominatim's rate limit
    if (addresses.indexOf(address) < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}