import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CityLookupRequest {
  city: string;
  limit?: number;
}

const UA = "LauflistenApp/1.0 (city-lookup@lovable.cloud)";

async function nominatimCitySearch(city: string, limit = 5) {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=Germany&format=jsonv2&addressdetails=1&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Nominatim error ${res.status} ${res.statusText}`);
  const rows = await res.json();
  return (rows ?? []).map((r: any) => ({
    city: r.address?.city || r.address?.town || r.address?.village || r.display_name?.split(",")[0] || city,
    state: r.address?.state || null,
    coordinates: r.lat && r.lon ? { lat: parseFloat(r.lat), lng: parseFloat(r.lon) } : null,
    nominatimPostcode: r.address?.postcode || null,
  }));
}

async function zippopotamPostalCodes(state: string, city: string): Promise<string[]> {
  try {
    const url = `https://api.zippopotam.us/de/${encodeURIComponent(state)}/${encodeURIComponent(city)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const data = await res.json();
    const set = new Set<string>();
    for (const p of (data.places ?? [])) {
      const pc = p["post code"] || p["post_code"] || p["postcode"];
      if (pc) set.add(String(pc));
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as CityLookupRequest;
    const city = (body.city || "").trim();
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 10);
    if (!city) {
      return new Response(JSON.stringify({ error: "city is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nmMatches = await nominatimCitySearch(city, limit);

    const matches = [] as Array<{ city: string; state: string | null; coordinates: {lat:number; lng:number} | null; postalCodes: string[] }>;
    for (const m of nmMatches) {
      let postalCodes: string[] = [];
      if (m.state && m.city) {
        postalCodes = await zippopotamPostalCodes(m.state, m.city);
      }
      // Fallback: use nominatim single postcode if available
      if (!postalCodes.length && m.nominatimPostcode) postalCodes = [m.nominatimPostcode];

      matches.push({ city: m.city, state: m.state, coordinates: m.coordinates, postalCodes });
    }

    return new Response(JSON.stringify({ matches }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("city-lookup error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
