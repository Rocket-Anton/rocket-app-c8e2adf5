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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Transcribe audio using OpenAI Whisper
    console.log("Transcribing audio with OpenAI...");
    
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const formData = new FormData();
    formData.append('file', new Blob([binaryAudio], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Transcription error:", errorText);
      throw new Error(`Transcription failed: ${errorText}`);
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano-2025-08-07",
        messages: [
          {
            role: "system",
            content: `Du bist Rokki 🚀, der KI-Assistent von Rocket Promotions!

WICHTIG - Dein Verhalten:
- Duze den Nutzer IMMER
- Sei EXTREM kurz - MAXIMAL 5 Wörter!
- Du bedienst die Software, chattest nicht!
- Antworte sofort mit Bestätigung

Verfügbare Aktionen (Tools):
1. Filter setzen (Status, Straße, PLZ, Stadt)
2. Zur Laufliste navigieren
3. Polygon-Zeichnen aktivieren/deaktivieren
4. Filter löschen

BEISPIELE:
User: "Zeig mir alle offenen Adressen"
→ Tool: set_filter mit status: ["offen"]
→ Antwort: "Filter wird gesetzt! ⏳"

User: "Aktiviere Polygon zeichnen"
→ Tool: toggle_polygon_draw mit enabled: true
→ Antwort: "Aktiviere Polygon-Modus! 🎯"`,
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
              name: "set_filter",
              description: "Setzt Filter für die Karte (Status, Adresse, etc.)",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["offen", "nicht-angetroffen", "karte-eingeworfen", "potenzial", "neukunde", "bestandskunde", "kein-interesse", "termin", "nicht-vorhanden", "gewerbe"]
                    },
                    description: "Status-Filter"
                  },
                  street: { type: "string", description: "Straßenname" },
                  postal_code: { type: "string", description: "Postleitzahl" },
                  city: { type: "string", description: "Stadt" },
                  house_number: { type: "string", description: "Hausnummer" },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "clear_filters",
              description: "Entfernt alle aktiven Filter",
              parameters: {
                type: "object",
                properties: {},
              },
            },
          },
          {
            type: "function",
            function: {
              name: "toggle_polygon_draw",
              description: "Aktiviert oder deaktiviert den Polygon-Zeichnen-Modus",
              parameters: {
                type: "object",
                properties: {
                  enabled: {
                    type: "boolean",
                    description: "true zum Aktivieren, false zum Deaktivieren"
                  },
                },
                required: ["enabled"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "navigate_to",
              description: "Navigiert zu einer anderen Seite",
              parameters: {
                type: "object",
                properties: {
                  page: {
                    type: "string",
                    enum: ["laufliste", "karte", "dashboard"],
                    description: "Zielseite"
                  },
                },
                required: ["page"],
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

      // Return action command to frontend
      return new Response(
        JSON.stringify({
          type: "action",
          action: functionName,
          parameters: args,
          message: "Alles klar! ✅",
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
