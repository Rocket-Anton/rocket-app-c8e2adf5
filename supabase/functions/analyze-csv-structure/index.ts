import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnMapping {
  [csvColumn: string]: string;
}

interface Question {
  column: string;
  question: string;
  options: string[];
  type: 'radio' | 'select';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { csvHeaders, sampleRows, providerId } = await req.json();

    console.log('Analyzing CSV structure:', { csvHeaders, sampleRows: sampleRows?.length, providerId });

    // Check for saved mappings for this provider
    let savedMapping = null;
    let savedMappingId = null;

    if (providerId) {
      const { data: mappings } = await supabase
        .from('csv_column_mappings')
        .select('*')
        .eq('provider_id', providerId)
        .order('usage_count', { ascending: false })
        .limit(1);

      if (mappings && mappings.length > 0) {
        const mapping = mappings[0];
        const savedColumns = Object.keys(mapping.column_mapping);
        const matchCount = csvHeaders.filter((h: string) => savedColumns.includes(h)).length;
        const matchPercentage = (matchCount / csvHeaders.length) * 100;

        if (matchPercentage >= 80) {
          savedMapping = mapping.column_mapping;
          savedMappingId = mapping.id;
          console.log(`Found saved mapping with ${matchPercentage.toFixed(0)}% match`);
        }
      }
    }

    // AI-based column recognition
    const suggestedMapping: ColumnMapping = {};
    const unmappedColumns: string[] = [];
    const questions: Question[] = [];

    for (const header of csvHeaders) {
      const normalizedHeader = header.toUpperCase().trim();

      // Auto-ignore irrelevant columns first (don't show in UI)
      if (/LANDKREIS|DISTRICT|KREIS|REGION|ZUSAMMEN|TOTAL|SUMME|ZEILENPRÜF|CHECKSUM|NICHT ÄNDERN|DO NOT CHANGE/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'ignore';
        continue; // Skip adding to unmappedColumns
      }

      // Street recognition (STRASSENNA, etc.)
      if (/STRASSE|STRA[SßS]E|STR\.|STREET|STRASSENNA/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'street';
      }
      // House number recognition (includes HAUSNR)
      else if (/^(HAUS|HN|NR|NUMMER|HOUSE|NO\.?|NUMBER|HAUSNR)$/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'house_number';
      }
      // House number add-on (ADRZUSATZ, Zusatz) - auto-combine with HAUSNR, don't show in UI
      else if (/ZUSATZ|ADRZUSATZ|ADD.*ON|SUFFIX/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'house_number_addon';
        continue; // Skip - will be automatically combined with house_number in backend
      }
      // Combined house number + add-on
      else if (/HN.*ZU|HAUS.*ZUSATZ|HNR.*ZU/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'house_number_combined';
      }
      // Postal code recognition
      else if (/PLZ|POST|ZIP/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'postal_code';
      }
      // City recognition (ORTSNAME is most important)
      else if (/^(ORT|CITY|STADT|ORTSNAME)$/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'city';
      }
      // Locality (Ortschaft) recognition - secondary to city
      else if (/ORTSCHAFT|LOCALITY|TEILORT|ORTSTEIL/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'locality';
      }
      // Residential units (WE, WOHNEINHEI)
      else if (/^(WE|WOHNEINHEI|WOHNUNGEN|RESIDENTIAL)$/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'units_residential';
      }
      // Commercial units (GE, GEWERBEEIN)
      else if (/^(GE|GEWERBE|GESCHÄFT|COMMERCIAL|GEWERBEEIN)$/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'units_commercial';
      }
      // Combined WE count (WEANZ)
      else if (/WEANZ|WE.*ANZ|ANZAHL.*WE/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'unit_count';
      }
      // Floor (Etage)
      else if (/ETAGE|FLOOR|STOCK|EG|OG/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'floor';
      }
      // Position (Lage)
      else if (/LAGE|POSITION|SEITE/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'position';
      }
      // Customer number/name (→ system notes)
      else if (/KUNDEN.*NR|KUNDENNUMMER|CUSTOMER.*ID/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'customer_number';
        questions.push({
          column: header,
          question: `Soll "${header}" in das Notizfeld der Einheiten eingetragen werden?`,
          options: ['Ja, als System-Notiz', 'Nein, ignorieren'],
          type: 'radio',
        });
      }
      else if (/KUNDEN.*NAME|KUNDENNAME|CUSTOMER.*NAME/i.test(normalizedHeader)) {
        suggestedMapping[header] = 'customer_name';
        questions.push({
          column: header,
          question: `Soll "${header}" in das Notizfeld der Einheiten eingetragen werden?`,
          options: ['Ja, als System-Notiz', 'Nein, ignorieren'],
          type: 'radio',
        });
      }
      // Unknown columns - only show these for manual mapping
      else {
        unmappedColumns.push(header);
      }
    }

    // Calculate confidence
    const mappedCount = Object.keys(suggestedMapping).length;
    const confidence = csvHeaders.length > 0 ? (mappedCount / csvHeaders.length) : 0;

    // Prepare example data from sample rows
    const exampleData: { [key: string]: string } = {};
    if (sampleRows && sampleRows.length > 0) {
      const firstRow = sampleRows[0];
      csvHeaders.forEach((header: string) => {
        exampleData[header] = firstRow[header] || '';
      });
    }

    return new Response(
      JSON.stringify({
        suggested_mapping: savedMapping || suggestedMapping,
        confidence: savedMapping ? 0.95 : confidence,
        has_saved_mapping: !!savedMapping,
        saved_mapping_id: savedMappingId,
        unmapped_columns: unmappedColumns,
        questions: questions,
        example_data: exampleData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing CSV:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
