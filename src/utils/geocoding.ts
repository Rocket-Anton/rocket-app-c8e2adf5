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

// Batch geocode addresses in parallel (fast, no rate limit delays)
export async function geocodeAddressesBatch(
  addresses: Array<{
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    coordinates?: [number, number];
  }>
): Promise<Array<{ lat: number; lng: number } | null>> {
  // Process all addresses in parallel for maximum speed
  const results = await Promise.all(
    addresses.map(async (address) => {
      // Skip if already has valid coordinates
      if (address.coordinates && hasValidCoordinates(address.coordinates)) {
        return {
          lng: address.coordinates[0],
          lat: address.coordinates[1]
        };
      }

      // Geocode in parallel - the edge function handles rate limiting internally
      const result = await geocodeAddress(
        address.street,
        address.houseNumber,
        address.postalCode,
        address.city
      );

      return result.coordinates;
    })
  );

  return results;
}