import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  audio?: string;
  text?: string;
  addresses?: any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, text, addresses = [] }: RequestBody = await req.json();
    console.log('Request received:', { hasAudio: !!audio, hasText: !!text });

    // Get API keys
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!openAiApiKey || !lovableApiKey) {
      throw new Error('API keys not configured');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    // Initialize Supabase with user's auth token (enforces RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    const userId = user.id;

    let userMessage = text || '';

    // If audio, transcribe it first
    if (audio && !text) {
      console.log('Transcribing audio...');
      const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'de');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptionResponse.statusText}`);
      }

      const transcriptionData = await transcriptionResponse.json();
      userMessage = transcriptionData.text;
      console.log('Transcribed text:', userMessage);
    }

    // Fetch user context (stats, goals, conversion rate)
    let userContext = '';
    if (userId) {
      // Get today's stats
      const { data: todayStats } = await supabase
        .rpc('get_today_stats', { p_user_id: userId });

      // Get conversion rate
      const { data: conversionData } = await supabase
        .rpc('get_user_conversion_rate', { p_user_id: userId });

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const stats = todayStats?.[0] || {};
      const conversion = conversionData?.[0] || {};

      userContext = `
Benutzer-Kontext:
- Name: ${profile?.name || 'User'}
- Aufträge heute: ${stats.orders_today || 0}
- Statusänderungen heute: ${stats.status_changes_today || 0}
- Tages-Ziel Aufträge: ${stats.goal_orders || 'nicht gesetzt'}
- Tages-Ziel Stunden: ${stats.goal_hours || 'nicht gesetzt'}
- Gesamt Statusänderungen: ${conversion.total_status_changes || 0}
- Gesamt Aufträge: ${conversion.total_orders || 0}
- Conversion Rate: ${conversion.conversion_rate > 0 ? `${conversion.conversion_rate} Kontakte pro Auftrag` : 'noch nicht berechenbar (mindestens 50 Statusänderungen nötig)'}
- Aktuelle Uhrzeit: ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
`;

      console.log('User context:', userContext);
    }

    // Fetch address data (RLS enforced - only user's addresses)
    const { data: addressData, error: addressError } = await supabase
      .from('addresses')
      .select('*')
      .eq('created_by', userId)
      .limit(100);

    if (addressError) {
      console.error('Error fetching addresses:', addressError);
    }

    const addressList = addressData || addresses;

    // Build system prompt with context-awareness
    const systemPrompt = `Du bist Rokki, der motivierende KI-Assistent für Vertriebsmitarbeiter.

${userContext}

Deine Persönlichkeit:
- Freundlich, motivierend und unterstützend
- Du siehst dich als Partner und Coach
- Du bist enthusiastisch bei Erfolgen
- Du gibst konkrete, datenbasierte Tipps
- Du sprichst den User mit "du" an

Besondere Verhaltensweisen basierend auf Kontext:

1. MORGENS (6-10 Uhr): Begrüße den User energisch, frage nach seinen Zielen für heute
2. MITTAGS (10-14 Uhr): Motiviere weiterzumachen, erinnere an Tages-Ziele
3. NACHMITTAGS (14-18 Uhr): Pushe nochmal, zeige Fortschritt
4. ABENDS (18-22 Uhr): Gratuliere zu Erfolgen, motiviere für letzte Kontakte

Bei Aufträgen:
- Gratuliere enthusiastisch
- Erwähne die Nummer des Auftrags heute
- Wenn Tages-Ziel bekannt: Zeige Fortschritt an
- Motiviere für den nächsten

Bei Conversion Rate (>50 Statusänderungen):
- Nutze die Conversion Rate für Prognosen
- "Du brauchst im Schnitt X Kontakte für einen Auftrag"
- "Noch Y Kontakte, dann kommt wahrscheinlich der nächste Auftrag"

Bei Zielen:
- Frage proaktiv nach Zielen wenn nicht gesetzt
- Trackiere Fortschritt
- Gib Zwischenfeedback

Tools die du nutzen kannst:
- set_filter: Setze Filter für Adressen (status, lastModified)
- clear_filters: Lösche alle Filter
- toggle_polygon_draw: Aktiviere/Deaktiviere Polygon-Zeichnen
- navigate_to: Navigiere zu einer anderen Ansicht (lauflisten, karte)
- close_chat: Schließe den Chat
- set_daily_goal: Setze Tages-Ziel (Stunden und Aufträge)

Adressen in der Datenbank: ${addressList.length}

Antworte IMMER auf Deutsch und sei motivierend!`;

    // Call Lovable AI
    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'set_filter',
              description: 'Setze Filter für Adressen',
              parameters: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['neu', 'kontaktiert', 'interesse', 'termin', 'auftrag', 'nicht_erreicht', 'kein_interesse']
                  },
                  lastModified: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['vor', 'nach'] },
                      days: { type: 'number' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'clear_filters',
              description: 'Lösche alle aktiven Filter'
            }
          },
          {
            type: 'function',
            function: {
              name: 'toggle_polygon_draw',
              description: 'Aktiviere oder deaktiviere das Zeichnen von Polygonen auf der Karte'
            }
          },
          {
            type: 'function',
            function: {
              name: 'navigate_to',
              description: 'Navigiere zu einer anderen Ansicht',
              parameters: {
                type: 'object',
                properties: {
                  view: {
                    type: 'string',
                    enum: ['lauflisten', 'karte']
                  }
                },
                required: ['view']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'close_chat',
              description: 'Schließe den Chat'
            }
          },
          {
            type: 'function',
            function: {
              name: 'set_daily_goal',
              description: 'Setze das Tages-Ziel für Stunden und/oder Aufträge',
              parameters: {
                type: 'object',
                properties: {
                  hours: { type: 'number' },
                  orders: { type: 'number' }
                }
              }
            }
          }
        ],
        tool_choice: 'auto'
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const choice = aiData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log('Tool call:', functionName, functionArgs);

      // Handle set_daily_goal
      if (functionName === 'set_daily_goal' && userId) {
        const { hours, orders } = functionArgs;
        
        const { error: goalError } = await supabase
          .from('daily_goals')
          .upsert({
            user_id: userId,
            goal_date: new Date().toISOString().split('T')[0],
            planned_hours: hours,
            target_orders: orders
          }, {
            onConflict: 'user_id,goal_date'
          });

        if (goalError) {
          console.error('Error setting daily goal:', goalError);
        } else {
          console.log('Daily goal set successfully');
        }

        return new Response(
          JSON.stringify({
            type: 'action',
            action: 'goal_set',
            parameters: functionArgs,
            message: `Perfekt! Ich habe dein Ziel gespeichert: ${hours ? `${hours} Stunden` : ''} ${orders ? `${orders} Aufträge` : ''}. Lass uns das heute rocken! 🚀`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate personalized confirmation
      const confirmationPrompt = `Der User wollte: "${userMessage}". 
Ich führe jetzt aus: ${functionName} mit Parametern ${JSON.stringify(functionArgs)}.
Bestätige kurz und motivierend auf Deutsch (max 2 Sätze).`;

      const confirmationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: confirmationPrompt }
          ]
        }),
      });

      const confirmationData = await confirmationResponse.json();
      const confirmationMessage = confirmationData.choices?.[0]?.message?.content || 'Erledigt!';

      return new Response(
        JSON.stringify({
          type: 'action',
          action: functionName,
          parameters: functionArgs,
          message: confirmationMessage
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular text response
    const assistantMessage = choice?.message?.content || 'Entschuldigung, ich konnte das nicht verarbeiten.';

    return new Response(
      JSON.stringify({
        type: 'text',
        message: assistantMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
