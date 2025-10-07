import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, transcribe the audio
    console.log("Transcribing audio...");
    const formData = new FormData();
    const audioBlob = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const userMessage = transcriptionData.text;
    console.log("Transcribed message:", userMessage);

    // Fetch all addresses from database
    const { data: addresses, error: addressError } = await supabase
      .from("addresses")
      .select("*");

    if (addressError) {
      console.error("Error fetching addresses:", addressError);
      throw addressError;
    }

    console.log(`Fetched ${addresses?.length || 0} addresses`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du bist Rokki 🚀, der freundliche KI-Assistent für die Adressverwaltung von Rocket Promotions!

WICHTIG - Dein Verhalten:
- Duze den Nutzer IMMER (niemals siezen!)
- Verwende regelmäßig passende Emojis 😊🎯✨ für gute Laune
- Sei enthusiastisch und hilfsbereit
- Halte deine Antworten kurz und prägnant
- Zeige Persönlichkeit und Energie! 💪

Verfügbare Adressen: ${JSON.stringify(addresses)}

Du kannst helfen bei:
- Adressen nach Straße, Hausnummer, PLZ oder Stadt zu suchen 🔍
- Adressen nach Status zu filtern (z.B. "offen", "potenzial", "neukunde", etc.) 📊
- Spezifische Adressen anzuzeigen 📍

Beispiele für gute Antworten:
- "Klar! 🎯 Ich zeige dir alle offenen Adressen..."
- "Super! ✨ Ich habe X Adressen in [Stadt] gefunden..."
- "Perfekt! 🚀 Hier sind die Ergebnisse..."`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_address",
              description: "Sucht Adressen nach Straße, Hausnummer, PLZ oder Stadt",
              parameters: {
                type: "object",
                properties: {
                  street: { type: "string", description: "Straßenname" },
                  house_number: { type: "string", description: "Hausnummer" },
                  postal_code: { type: "string", description: "Postleitzahl" },
                  city: { type: "string", description: "Stadt" },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "filter_by_status",
              description: "Filtert Adressen nach Unit-Status",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["offen", "nicht-angetroffen", "karte-eingeworfen", "potenzial", "neukunde", "bestandskunde", "kein-interesse", "termin", "nicht-vorhanden", "gewerbe"],
                    description: "Der gewünschte Status",
                  },
                },
                required: ["status"],
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Check if AI wants to use tools
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`Tool call: ${functionName}`, args);

      let results: any[] = [];

      if (functionName === "search_address") {
        // Filter addresses based on criteria
        results = addresses.filter((addr: any) => {
          const matchStreet = !args.street || addr.street.toLowerCase().includes(args.street.toLowerCase());
          const matchHouseNumber = !args.house_number || addr.house_number === args.house_number;
          const matchPostalCode = !args.postal_code || addr.postal_code === args.postal_code;
          const matchCity = !args.city || addr.city.toLowerCase().includes(args.city.toLowerCase());
          return matchStreet && matchHouseNumber && matchPostalCode && matchCity;
        });
      } else if (functionName === "filter_by_status") {
        // Filter by unit status
        results = addresses.filter((addr: any) => {
          if (!addr.units || !Array.isArray(addr.units)) return false;
          return addr.units.some((unit: any) => unit.status === args.status);
        });
      }

      console.log(`Found ${results.length} matching addresses`);

      return new Response(
        JSON.stringify({
          type: "tool_result",
          function: functionName,
          args,
          results: results.map(r => ({
            id: r.id,
            street: r.street,
            house_number: r.house_number,
            postal_code: r.postal_code,
            city: r.city,
            coordinates: r.coordinates,
            units: r.units,
          })),
          message: data.choices[0].message.content || `${results.length} Adressen gefunden`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return regular text response
    return new Response(
      JSON.stringify({
        type: "text",
        message: data.choices[0]?.message?.content || "Keine Antwort erhalten",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
