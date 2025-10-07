import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  street: string;
  houseNumber: string; // z.B. "12" oder "12a"
  postalCode?: string;
  city?: string;
}

const UA = "LauflistenApp/1.0 (contact@example.com)";

const deg2rad = (d: number) => d * Math.PI / 180;
function haversine(a: {lat:number,lng:number}, b:{lat:number,lng:number}) {
  const R = 6371000;
  const dLat = deg2rad(b.lat - a.lat), dLon = deg2rad(b.lng - a.lng);
  const la1 = deg2rad(a.lat), la2 = deg2rad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

// --- helpers for matching ---
const norm = (s = "") => s.normalize("NFKC").trim().toLowerCase();
const escRe = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function hnMatches(targetRaw: string, tagRaw: string): { exact:boolean; inRange:boolean; } {
  const target = norm(targetRaw);
  const tag = norm(tagRaw);

  // exact (inkl. Buchstaben wie 12a)
  if (tag === target) return { exact: true, inRange: false };

  // Mehrfachnummern getrennt durch ';' oder ','
  for (const part of tag.split(/[;,]/).map(s => s.trim())) {
    if (part === target) return { exact: true, inRange: false };
  }

  // Spannen wie "2-4" / "2–4" / "2/4"
  const m = tag.match(/^(\d+)\s*[-–/]\s*(\d+)$/);
  if (m) {
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10), t = parseInt(target, 10);
    if (!Number.isNaN(t) && a <= t && t <= b) return { exact: false, inRange: true };
  }
  return { exact:false, inRange:false };
}

function centroidOfPolygon(coords: number[][]) {
  let A = 0, cx = 0, cy = 0;
  for (let i=0, j=coords.length-1; i<coords.length; j=i++) {
    const [x1,y1]=coords[j], [x2,y2]=coords[i];
    const f = x1*y2 - x2*y1; A += f; cx += (x1+x2)*f; cy += (y1+y2)*f;
  }
  A *= 0.5;
  if (!A) return { lat: coords[0][1], lng: coords[0][0] };
  return { lng: cx/(6*A), lat: cy/(6*A) };
}
function centroidOfGeoJSON(geo:any) {
  try {
    if (geo?.type === "Polygon") return centroidOfPolygon(geo.coordinates[0]);
    if (geo?.type === "MultiPolygon") return centroidOfPolygon(geo.coordinates[0][0]);
  } catch {}
  return null;
}

// --- Nominatim just to get a nearby seed point (and polygon fallback) ---
async function getNominatimSeed(a: GeocodeRequest) {
  const q = `${a.houseNumber} ${a.street}, ${a.postalCode ?? ""} ${a.city ?? ""}, Germany`;
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(q)}&format=jsonv2&limit=1&addressdetails=1&polygon_geojson=1`;

  console.log('Nominatim seed query:', q);

  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`Nominatim ${r.status} ${r.statusText}`);
  const rows = await r.json();
  if (!rows?.length) return null;

  const row = rows[0];
  let seed = { lat: parseFloat(row.lat), lng: parseFloat(row.lon) };
  let polyCentroid = seed;
  if (row.geojson) {
    const c = centroidOfGeoJSON(row.geojson);
    if (c) polyCentroid = c;
  }
  console.log('Nominatim seed point:', seed, 'polygon centroid:', polyCentroid);
  return { seed, polyCentroid };
}

// --- Overpass around the seed: fetch addr:* + buildings + entrances ---
async function overpassAround(seed:{lat:number; lng:number}, a: GeocodeRequest) {
  const around = 120; // Meter – eng genug, aber tolerant
  const stRe = escRe(a.street);
  const q = `
[out:json][timeout:30];
(
  nwr(around:${around},${seed.lat},${seed.lng})["addr:housenumber"];
  way(around:${around},${seed.lat},${seed.lng})["building"]["addr:housenumber"];
  relation(around:${around},${seed.lat},${seed.lng})["building"]["addr:housenumber"];
  node(around:${around},${seed.lat},${seed.lng})["entrance"]["addr:housenumber"];
);
out tags center qt;
`;

  console.log('Overpass around query for:', a);

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const json = await res.json();
  const elements = (json?.elements ?? []) as any[];

  console.log('Overpass found', elements.length, 'candidates');

  // Scoring
  const wantedStreet = norm(a.street);
  const wantedCity = norm(a.city ?? "");
  const wantedHN = a.houseNumber;

  type Cand = {
    type: "node"|"way"|"relation";
    id: number;
    lat: number;
    lng: number;
    tags?: Record<string,string>;
    score: number;
  };

  const candidates: Cand[] = elements.map((e:any) => {
    const point = e.type === "node"
      ? { lat: e.lat, lng: e.lon }
      : (e.center ? { lat: e.center.lat, lng: e.center.lon } : null);
    if (!point) return null;

    const tags = e.tags || {};
    const hn = tags["addr:housenumber"] ?? "";
    const st = norm(tags["addr:street"] ?? tags["addr:place"] ?? "");
    const ci = norm(tags["addr:city"] ?? "");
    const m = hnMatches(wantedHN, hn);

    let score = 0;
    if (m.exact) score += 100;
    else if (m.inRange) score += 70;

    if (st && st === wantedStreet) score += 25;
    if (ci && wantedCity && ci === wantedCity) score += 10;

    // Nähe zum Seed (bis 120 m)
    const d = haversine(seed, point);
    score += Math.max(0, 40 - d/3); // ~+40 bei 0m, 0 bei 120m

    return { type:e.type, id:e.id, lat:point.lat, lng:point.lng, tags, score } as Cand;
  }).filter(Boolean) as Cand[];

  candidates.sort((a,b) => b.score - a.score);
  const best = candidates[0];

  if (best) {
    console.log('Best candidate:', best.type, best.id, 'score:', best.score, 'tags:', best.tags);
  }

  // Wenn best ein Way/Relation ist, versuche den nächsten Eingang dieses Gebäudes
  if (best && (best.type === "way" || best.type === "relation")) {
    try {
      const q2 = `
[out:json][timeout:25];
${best.type}(${best.id});
node(w)["entrance"];
out qt;`;
      console.log('Looking for entrances of', best.type, best.id);
      const r2 = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q2)}`, { headers: { "User-Agent": UA } });
      if (r2.ok) {
        const j2 = await r2.json();
        const entrances = (j2?.elements ?? []).filter((n:any)=>n.type==="node");
        console.log('Found', entrances.length, 'entrances');
        if (entrances.length) {
          // nimm den Eingang, der dem Seed am nächsten ist
          let bestEnt = entrances[0];
          let bestD = Number.POSITIVE_INFINITY;
          for (const n of entrances) {
            const d = haversine(seed, { lat:n.lat, lng:n.lon });
            if (d < bestD) { bestD = d; bestEnt = n; }
          }
          console.log('Using entrance at:', bestEnt.lat, bestEnt.lon);
          return { lat: bestEnt.lat, lng: bestEnt.lon };
        }
      }
    } catch (e) {
      console.error('Error fetching entrances:', e);
    }
  }

  return best ? { lat: best.lat, lng: best.lng } : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as GeocodeRequest;
    if (!body.street || !body.houseNumber) {
      return new Response(JSON.stringify({ error: "street and houseNumber are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Geocoding request:', body);

    // 1) Seed von Nominatim
    const seed = await getNominatimSeed(body);
    if (!seed) {
      console.error('No seed found from Nominatim');
      return new Response(JSON.stringify({ error: "Address not found", coordinates: null }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Präzise via Overpass um den Seed
    let point = await overpassAround(seed.seed, body);

    // 3) Fallback: Nominatim-Polygon-Centroid (Gebäude)
    if (!point) {
      console.log('No Overpass result, using Nominatim polygon centroid');
      point = seed.polyCentroid;
    }

    console.log('Final geocoded coordinates:', point);

    return new Response(JSON.stringify({ 
      coordinates: point,
      displayName: `${body.street} ${body.houseNumber}, ${body.postalCode} ${body.city}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error('Geocoding error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
