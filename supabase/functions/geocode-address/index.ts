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
  postalCode?: string;
  city?: string;
}

/* ---------- helpers ---------- */

function esc(s = "") { 
  return s.replace(/"/g, '\\"').trim(); 
}

function buildOverpassQuery({ street, houseNumber, postalCode, city }: GeocodeRequest) {
  // Suche im Stadtgebiet (oder ersatzweise in ganz DE) nach addr:* exakt passend
  const area =
    city && city.trim()
      ? `area["name"="${esc(city)}"]["boundary"="administrative"]["admin_level"~"^(6|7|8|9|10)$"]->.a;`
      : `area["ISO3166-1"="DE"][admin_level=2]->.a;`;

  const filters = [
    `["addr:housenumber"="${esc(houseNumber)}"]`,
    `["addr:street"="${esc(street)}"]`,
    postalCode ? `["addr:postcode"="${esc(postalCode)}"]` : "",
    city ? `["addr:city"="${esc(city)}"]` : "",
  ].join("");

  return `
    [out:json][timeout:25];
    ${area}
    (
      node${filters}(area.a);
      way${filters}(area.a);
      relation${filters}(area.a);
      node["entrance"]["addr:housenumber"="${esc(houseNumber)}"]["addr:street"="${esc(street)}"](area.a);
    );
    out tags center;
  `;
}

function pickOverpassPoint(el: any) {
  if (!el) return null;
  if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lng: el.lon };
  }
  if ((el.type === "way" || el.type === "relation") && el.center) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function centroidOfPolygon(coords: number[][]) {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [x1, y1] = coords[j], [x2, y2] = coords[i];
    const f = x1 * y2 - x2 * y1;
    area += f; 
    cx += (x1 + x2) * f; 
    cy += (y1 + y2) * f;
  }
  area *= 0.5;
  if (!area) return { lat: coords[0][1], lng: coords[0][0] };
  return { lng: cx / (6 * area), lat: cy / (6 * area) };
}

function centroidOfGeoJSON(geojson: any) {
  try {
    if (geojson?.type === "Polygon") return centroidOfPolygon(geojson.coordinates[0]);
    if (geojson?.type === "MultiPolygon") return centroidOfPolygon(geojson.coordinates[0][0]);
  } catch {}
  return null;
}

/* ---------- service ---------- */

async function geocodeWithOverpass(addr: GeocodeRequest) {
  const q = buildOverpassQuery(addr);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;

  console.log('Calling Overpass API for:', addr);

  const res = await fetch(url, {
    headers: { "User-Agent": "LauflistenApp/1.0" },
  });
  
  if (!res.ok) {
    console.error('Overpass API error:', res.status, res.statusText);
    throw new Error(`Overpass ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  console.log('Overpass response:', data);

  // Ergebniswahl: priorisiere exakte Adress-Node > Gebäude-Way > Relation
  const elements = (data?.elements ?? []) as any[];
  const node = elements.find((e) => e.type === "node");
  const way = elements.find((e) => e.type === "way");
  const rel = elements.find((e) => e.type === "relation");

  const result = pickOverpassPoint(node) || pickOverpassPoint(way) || pickOverpassPoint(rel) || null;
  console.log('Overpass result:', result);
  return result;
}

async function geocodeWithNominatim(addr: GeocodeRequest) {
  const query = `${addr.houseNumber} ${addr.street}, ${addr.postalCode ?? ""} ${addr.city ?? ""}, Germany`;
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}` +
    `&format=jsonv2&limit=1&addressdetails=1&polygon_geojson=1`;

  console.log('Calling Nominatim API (fallback):', query);

  const res = await fetch(url, { 
    headers: { "User-Agent": "LauflistenApp/1.0" } 
  });
  
  if (!res.ok) {
    console.error('Nominatim API error:', res.status, res.statusText);
    throw new Error(`Nominatim ${res.status} ${res.statusText}`);
  }
  
  const rows = await res.json();
  console.log('Nominatim response:', rows);
  
  if (!rows?.length) return null;

  const r = rows[0];
  let coordinates = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
  if (r.geojson) {
    const c = centroidOfGeoJSON(r.geojson);
    if (c) coordinates = c;
  }
  console.log('Nominatim result:', coordinates);
  return coordinates;
}

/* ---------- http ---------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { street, houseNumber, postalCode, city } = (await req.json()) as GeocodeRequest;

    console.log('Geocoding address:', { street, houseNumber, postalCode, city });

    // 1) Präzise Suche via Overpass
    let coordinates = null;
    try {
      coordinates = await geocodeWithOverpass({ street, houseNumber, postalCode, city });
    } catch (error) {
      console.error('Overpass failed, falling back to Nominatim:', error);
    }

    // 2) Fallback: Nominatim + Polygon-Schwerpunkt
    if (!coordinates) {
      try {
        coordinates = await geocodeWithNominatim({ street, houseNumber, postalCode, city });
      } catch (error) {
        console.error('Nominatim also failed:', error);
      }
    }

    if (!coordinates) {
      console.error('No results found for address');
      return new Response(
        JSON.stringify({ 
          error: "Address not found", 
          coordinates: null 
        }), 
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Geocoded coordinates:', coordinates);

    return new Response(
      JSON.stringify({ 
        coordinates,
        displayName: `${street} ${houseNumber}, ${postalCode} ${city}`
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error('Error in geocode-address function:', err);
    return new Response(
      JSON.stringify({ 
        error: String(err) 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
