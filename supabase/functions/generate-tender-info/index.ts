import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, existingText, improvementInstruction, context } = await req.json();
    
    // Initialize Supabase client for RAG
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let transcribedText = "";

    // If audio is provided, transcribe it first using Whisper
    if (audio) {
      console.log("Transcribing audio...");
      
      // Decode base64 audio
      const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      
      // Create form data for Whisper API
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'de');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      });

      if (!whisperResponse.ok) {
        const error = await whisperResponse.text();
        console.error('Whisper API error:', error);
        throw new Error('Audio transcription failed');
      }

      const whisperData = await whisperResponse.json();
      transcribedText = whisperData.text;
      console.log("Transcribed text:", transcribedText);
    }

    console.log('Generating text with AI...');

    // RAG: Fetch provider-specific instructions
    let providerInstructions: string[] = [];
    if (context?.providerId) {
      const { data: instructions } = await supabase
        .from('provider_ai_instructions')
        .select('instruction_text, instruction_category')
        .eq('provider_id', context.providerId)
        .order('created_at', { ascending: false });
      
      if (instructions && instructions.length > 0) {
        providerInstructions = instructions.map(i => `[${i.instruction_category}] ${i.instruction_text}`);
        console.log(`Loaded ${instructions.length} provider instructions`);
      }
    }

    // RAG: Fetch project-specific instructions
    let projectInstructions: string[] = [];
    if (context?.projectId) {
      const { data: instructions } = await supabase
        .from('project_ai_instructions')
        .select('instruction_text, area_name')
        .eq('project_id', context.projectId)
        .order('created_at', { ascending: false });
      
      if (instructions && instructions.length > 0) {
        projectInstructions = instructions
          .filter(i => !i.area_name || i.area_name === context?.areaName)
          .map(i => i.instruction_text);
        console.log(`Loaded ${projectInstructions.length} project instructions`);
      }
    }

    // Build the enhanced system prompt with RAG context
    let systemPrompt = `Du bist ein Projekt-Manager, der ansprechende Exposé-Texte für Vertriebsprojekte erstellt.

Wichtige Regeln:
- Schreibe wie ein Exposé, NICHT wie einen Brief
- Duze die "Raketen" (unsere Vertriebspartner)
- KEINE Anreden wie "Liebe Raketen" oder Grußformeln
- KEINE Sternchen für Formatierung - nutze direkte HTML-Tags
- Schreibe menschlich und motivierend, NICHT KI-mäßig
- Sei enthusiastisch, aber authentisch

Begriffe:
- Vorvermarktung = Erstvermarktung (erste Runde, maximale Potenziale)
- Bauvermarktung = Nachvermarktung (nach Vorvermarktung)

Verwende HTML für Formatierung:
- <strong>Text</strong> für Fettdruck
- <em>Text</em> für Kursiv
- <br> für Zeilenumbrüche
- <p>Text</p> für Absätze

Der Text soll direkt mit den wichtigsten Infos starten, ohne Anrede.

${providerInstructions.length > 0 ? `
WICHTIGE PROVIDER-SPEZIFISCHE REGELN FÜR ${context?.providerName || 'diesen Provider'}:
${providerInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
` : ''}

${projectInstructions.length > 0 ? `
WICHTIGE PROJEKT-SPEZIFISCHE REGELN:
${projectInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
` : ''}`;

    let userPrompt = "";

    if (improvementInstruction) {
      // Improvement mode
      systemPrompt += "\n\nDu verbesserst einen bestehenden Exposé-Text basierend auf den gegebenen Anweisungen. Behalte HTML-Formatierung bei.";
      userPrompt = `Bestehender Text:\n${existingText}\n\nVerbesserungsanweisung: ${improvementInstruction}\n\nBitte verbessere den Text entsprechend der Anweisung und behalte die HTML-Formatierung bei.`;
    } else if (transcribedText) {
      // Generation from transcription
      userPrompt = `Basierend auf folgender Spracheingabe, erstelle einen strukturierten Exposé-Text mit HTML-Formatierung:\n\n${transcribedText}`;
      
      if (context?.providerName) {
        userPrompt += `\n\nProvider: ${context.providerName}`;
      }
      if (context?.projectName) {
        userPrompt += `\nProjekt: ${context.projectName}`;
      }
      if (context?.areaName) {
        userPrompt += `\nGebiet: ${context.areaName}`;
      }
    } else {
      throw new Error('Neither audio nor improvement instruction provided');
    }

    // Call Lovable AI to generate the text
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No text generated by AI');
    }

    console.log("Text generated successfully");

    return new Response(
      JSON.stringify({ 
        generatedText,
        transcribedText: transcribedText || undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-tender-info:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
