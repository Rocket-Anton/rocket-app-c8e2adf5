import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_BATCHES_PER_CALL = 3; // Process max 3 batches per function call

interface CSVRow {
  PLZ: string
  ORT: string
  STRASSE: string
  HAUSNR: string
  WEANZ?: string
  STATUS?: string
  ETAGE?: string
  LAGE?: string
  NOTIZ_ADRESSE?: string
  NOTIZ_WE?: string
}

interface ParsedAddress {
  postalCode: string
  city: string
  street: string
  houseNumber: string
  weCount: number
  status: string
  locality?: string
  etage?: string
  lage?: string
  notizAdresse?: string
  notizWE?: string
  unitNote?: string
  coordinates?: {
    lat: number | null
    lng: number | null
  }
}

interface GeocodeResult {
  lat: number | null
  lng: number | null
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const authHeader = req.headers.get('Authorization') || ''
    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(accessToken)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // Handle JSON body uploads
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      console.log('Processing JSON upload request');
      
      const requestData = await req.json();
      const { 
        projectId, 
        listName, 
        csvData, 
        columnMapping, 
        questionAnswers,
        marketingType,
        resumeListId 
      } = requestData;

      // ===== RESUME LOGIC =====
      if (resumeListId) {
        console.log(`Resuming import for list ${resumeListId}`);
        
        const { data: existingList, error: listCheckError } = await supabaseClient
          .from('project_address_lists')
          .select('id, status, last_processed_index, import_payload, project_id')
          .eq('id', resumeListId)
          .single();

        if (listCheckError || !existingList) {
          console.error('List not found for resume:', listCheckError);
          return new Response(
            JSON.stringify({ error: 'List not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        if (existingList.status === 'completed') {
          return new Response(
            JSON.stringify({ error: 'Import already completed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        if (!existingList.import_payload) {
          console.error('Import payload missing - cannot resume');
          await supabaseClient
            .from('project_address_lists')
            .update({ 
              status: 'failed',
              error_details: { error: 'Import payload missing - cannot resume. Please restart the import.' },
              updated_at: new Date().toISOString()
            })
            .eq('id', resumeListId);
          
          return new Response(
            JSON.stringify({ error: 'Import payload missing - cannot resume' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        console.log(`Resuming from index ${existingList.last_processed_index}`);
        
        await supabaseClient
          .from('project_address_lists')
          .update({ 
            status: 'importing',
            last_progress_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', resumeListId);

        EdgeRuntime.waitUntil(
          processChunk(
            resumeListId, 
            existingList.project_id,
            existingList.import_payload,
            supabaseClient, 
            authHeader
          )
        );
        
        return new Response(
          JSON.stringify({ 
            message: 'Import resumed',
            listId: resumeListId,
            resumedFrom: existingList.last_processed_index
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // ===== NEW IMPORT LOGIC =====
      if (!projectId || !Array.isArray(csvData) || !columnMapping) {
        return new Response(
          JSON.stringify({ error: 'Missing projectId, csvData or columnMapping' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Processing new import for project ${projectId}`);

      // Parse and normalize addresses
      const addresses = parseAddressesFromCSV(csvData, columnMapping, questionAnswers);
      
      if (addresses.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid addresses found in CSV' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prepare import payload for resume capability
      const importPayload = {
        csvData,
        columnMapping,
        questionAnswers,
        marketingType,
        totalAddresses: addresses.length,
        userId
      };

      // Create the address list record with import_payload
      const { data: newList, error: listError } = await supabaseClient
        .from('project_address_lists')
        .insert({
          project_id: projectId,
          name: listName,
          file_name: `${listName}.csv`,
          status: 'importing',
          column_mapping: columnMapping,
          chunk_size: 100,
          last_processed_index: 0,
          import_payload: importPayload,
          last_progress_at: new Date().toISOString(),
          upload_stats: {
            total: addresses.length,
            successful: 0,
            failed: 0
          },
          created_by: userId
        })
        .select()
        .single();

      if (listError) {
        console.error('Failed to create list:', listError);
        return new Response(
          JSON.stringify({ error: 'Failed to create address list' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created list ${newList.id}, starting background import`);

      // Start background processing
      EdgeRuntime.waitUntil(
        processChunk(newList.id, projectId, importPayload, supabaseClient, authHeader)
      );
      
      return new Response(
        JSON.stringify({ 
          message: 'Import started', 
          listId: newList.id,
          totalAddresses: addresses.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const body = await req.formData()
    const fileName = body.get('file-name') as string | null
    const file = body.get('file') as File | null
    const projectId = body.get('project-id') as string | null
    const listName = body.get('list-name') as string | null
    const columnMappingString = body.get('column-mapping') as string | null
    const marketingType = body.get('marketing-type') as string | null
    const questionAnswersString = body.get('question-answers') as string | null

    if (!file || !fileName || !projectId || !listName || !columnMappingString) {
      return new Response(
        JSON.stringify({ error: 'Missing file, project-id, list-name or column mapping' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let columnMapping
    try {
      columnMapping = JSON.parse(columnMappingString)
    } catch (e) {
      console.error('Failed to parse column mapping', e)
      return new Response(
        JSON.stringify({ error: 'Invalid column mapping' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let questionAnswers = null
    if (questionAnswersString) {
      try {
        questionAnswers = JSON.parse(questionAnswersString)
      } catch (e) {
        console.warn('Failed to parse question answers, ignoring', e)
      }
    }

    const fileBuffer = await file.arrayBuffer()
    const fileContent = new TextDecoder().decode(fileBuffer)

    const csvData = fileContent
      .split('\n')
      .map((line) => line.split(';').map((entry) => entry.trim()))

    const header = csvData.shift()

    if (!header) {
      return new Response(
        JSON.stringify({ error: 'CSV file is empty or has no header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jsonData = csvData.map((row) => {
      const rowData: { [key: string]: string } = {}
      header.forEach((headerCell, index) => {
        rowData[headerCell] = row[index] || ''
      })
      return rowData
    })

    const addresses = parseAddressesFromCSV(jsonData, columnMapping, questionAnswers)

    if (addresses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid addresses found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: newList, error: listError } = await supabaseClient
      .from('project_address_lists')
      .insert({
        project_id: projectId,
        name: listName,
        file_name: fileName,
        status: 'importing',
        column_mapping: columnMapping,
        chunk_size: 100,
        upload_stats: {
          total: addresses.length,
          successful: 0,
          failed: 0,
        },
        created_by: userId,
      })
      .select()
      .single()

    if (listError) {
      console.error('Failed to create list:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to create address list' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failCount = 0

    for (const addr of addresses) {
      try {
        const { data: insertedAddress, error: insertError } = await supabaseClient
          .from('addresses')
          .insert({
            street: addr.street,
            house_number: addr.houseNumber,
            postal_code: addr.postalCode,
            city: addr.city,
            locality: addr.locality || '',
            coordinates: addr.coordinates || { lat: null, lng: null },
            project_id: projectId,
            list_id: newList.id,
            notiz: addr.notizAdresse || '',
            created_by: userId,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to insert address:', insertError)
          failCount++
          continue
        }

        if (addr.weCount > 0) {
          const unitsToInsert = []
          for (let i = 0; i < addr.weCount; i++) {
            unitsToInsert.push({
              address_id: insertedAddress.id,
              etage: addr.etage || '',
              lage: addr.lage || '',
              notiz: addr.notizWE || '',
              system_notes: addr.unitNote || '',
              marketable: addr.status !== 'Verbot',
              status: addr.status === 'Verbot' ? 'Nicht vermarktbar' : 'Offen',
            })
          }

          const { error: unitsError } = await supabaseClient
            .from('units')
            .insert(unitsToInsert)

          if (unitsError) {
            console.error('Failed to insert units:', unitsError)
          }
        }

        if (!addr.coordinates?.lat || !addr.coordinates?.lng) {
          try {
            await supabaseClient.functions.invoke('geocode-address', {
              body: {
                addressId: insertedAddress.id,
                street: addr.street,
                houseNumber: addr.houseNumber,
                postalCode: addr.postalCode,
                city: addr.city,
              },
            })
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError)
          }
        }

        successCount++
      } catch (error) {
        console.error('Error processing address:', error)
        failCount++
      }
    }

    await supabaseClient
      .from('project_address_lists')
      .update({
        status: 'completed',
        upload_stats: {
          total: addresses.length,
          successful: successCount,
          failed: failCount,
        },
      })
      .eq('id', newList.id)

    return new Response(
      JSON.stringify({ message: 'File uploaded and processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    return new Response(
      JSON.stringify({ error: 'Unsupported content type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Process a chunk of addresses and self-invoke if more work remains
async function processChunk(
  listId: string,
  projectId: string,
  importPayload: any,
  supabaseClient: any,
  authHeader: string
) {
  try {
    console.log(`processChunk: Starting for list ${listId}`);
    
    const { data: list, error: listError } = await supabaseClient
      .from('project_address_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      console.error('Failed to load list:', listError);
      return;
    }

    const { chunk_size = 100, last_processed_index = 0, upload_stats } = list;
    const { csvData, columnMapping, questionAnswers, userId } = importPayload;

    const addresses = parseAddressesFromCSV(csvData, columnMapping, questionAnswers);
    
    if (addresses.length === 0) {
      console.log('No addresses to process, marking as completed');
      await supabaseClient
        .from('project_address_lists')
        .update({
          status: 'completed',
          last_progress_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);
      return;
    }

    console.log(`Processing ${addresses.length} addresses from index ${last_processed_index}`);

    let currentIndex = last_processed_index;
    let batchesProcessed = 0;
    let successCount = upload_stats?.successful || 0;
    let failCount = upload_stats?.failed || 0;

    // Process MAX_BATCHES_PER_CALL batches
    while (currentIndex < addresses.length && batchesProcessed < MAX_BATCHES_PER_CALL) {
      const endIndex = Math.min(currentIndex + chunk_size, addresses.length);
      const batch = addresses.slice(currentIndex, endIndex);
      
      console.log(`Processing batch ${batchesProcessed + 1}/${MAX_BATCHES_PER_CALL}: ${currentIndex}-${endIndex}/${addresses.length}`);

      for (const addr of batch) {
        try {
          // Insert address
          const { data: insertedAddress, error: insertError } = await supabaseClient
            .from('addresses')
            .insert({
              street: addr.street,
              house_number: addr.houseNumber,
              postal_code: addr.postalCode,
              city: addr.city,
              locality: addr.locality || '',
              coordinates: addr.coordinates || { lat: null, lng: null },
              project_id: projectId,
              list_id: listId,
              notiz: addr.notizAdresse || '',
              created_by: userId
            })
            .select()
            .single();

          if (insertError) {
            console.error('Failed to insert address:', insertError);
            failCount++;
            continue;
          }

          // Insert units
          if (addr.weCount > 0) {
            const unitsToInsert = [];
            for (let i = 0; i < addr.weCount; i++) {
              unitsToInsert.push({
                address_id: insertedAddress.id,
                etage: addr.etage || '',
                lage: addr.lage || '',
                notiz: addr.notizWE || '',
                system_notes: addr.unitNote || '',
                marketable: addr.status !== 'Verbot',
                status: addr.status === 'Verbot' ? 'Nicht vermarktbar' : 'Offen'
              });
            }

            const { error: unitsError } = await supabaseClient
              .from('units')
              .insert(unitsToInsert);

            if (unitsError) {
              console.error('Failed to insert units:', unitsError);
            }
          }

          // Geocode if needed
          if (!addr.coordinates?.lat || !addr.coordinates?.lng) {
            try {
              await supabaseClient.functions.invoke('geocode-address', {
                body: {
                  addressId: insertedAddress.id,
                  street: addr.street,
                  houseNumber: addr.houseNumber,
                  postalCode: addr.postalCode,
                  city: addr.city
                }
              });
            } catch (geocodeError) {
              console.error('Geocoding error:', geocodeError);
            }
          }

          successCount++;
        } catch (error) {
          console.error('Error processing address:', error);
          failCount++;
        }
      }

      currentIndex = endIndex;
      batchesProcessed++;

      // Update progress after each batch
      await supabaseClient
        .from('project_address_lists')
        .update({
          last_processed_index: currentIndex,
          last_progress_at: new Date().toISOString(),
          upload_stats: {
            total: addresses.length,
            successful: successCount,
            failed: failCount
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);

      console.log(`Batch complete: ${currentIndex}/${addresses.length} addresses processed`);
    }

    // Check if we're done or need to continue
    if (currentIndex >= addresses.length) {
      console.log('Import completed successfully');
      await supabaseClient
        .from('project_address_lists')
        .update({
          status: 'completed',
          last_processed_index: 0,
          last_progress_at: new Date().toISOString(),
          upload_stats: {
            total: addresses.length,
            successful: successCount,
            failed: failCount
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);
    } else {
      // More work to do - self-invoke to continue
      console.log(`Scheduling continuation: ${currentIndex}/${addresses.length} processed`);
      
      try {
        const continueResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/upload-street-list`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              resumeListId: listId
            })
          }
        );

        if (!continueResponse.ok) {
          console.error('Failed to schedule continuation:', await continueResponse.text());
        } else {
          console.log('Successfully scheduled continuation');
        }
      } catch (error) {
        console.error('Error scheduling continuation:', error);
      }
    }

  } catch (error) {
    console.error('Chunk processing failed:', error);
    await supabaseClient
      .from('project_address_lists')
      .update({
        status: 'failed',
        error_details: { error: error instanceof Error ? error.message : 'Unknown error' },
        last_progress_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);
  }
}

// Helper: Parse addresses from CSV data
function parseAddressesFromCSV(csvData: any[], columnMapping: any, questionAnswers: any): ParsedAddress[] {
  const addresses: ParsedAddress[] = [];
  
  const getCol = (key: string) => Object.keys(columnMapping).find(k => columnMapping[k] === key);
  const val = (row: any, key: string): string => {
    const col = getCol(key);
    const v = col ? row[col] : undefined;
    return (v === null || v === undefined) ? '' : String(v);
  };

  const normalizeHouseNumber = (houseNumber: string): string => {
    if (!houseNumber) return '';
    return houseNumber.replace(/[A-Z]/g, (match) => match.toLowerCase());
  };

  for (const row of csvData) {
    const street = val(row, 'street').trim();
    let houseNumber = val(row, 'house_number').trim();
    const hCombined = val(row, 'house_number_combined').trim();
    const hAddon = val(row, 'house_number_addon').trim();
    
    if (!houseNumber && hCombined) houseNumber = hCombined;
    if (houseNumber && hAddon) houseNumber = `${houseNumber}${hAddon}`;
    houseNumber = normalizeHouseNumber(houseNumber);
    
    const postalCode = val(row, 'postal_code').trim();
    const city = val(row, 'city').trim();
    const locality = val(row, 'locality').trim();

    if (!street || !postalCode || !city) {
      continue;
    }

    const unitCountStr = val(row, 'unit_count');
    const weStr = val(row, 'units_residential');
    const geStr = val(row, 'units_commercial');
    
    let weCount = parseInt(unitCountStr) || 0;
    
    if (!weCount) {
      const weNum = parseInt(weStr) || 0;
      const geNum = parseInt(geStr) || 0;
      const geCalculationAnswer = questionAnswers?.ge_calculation;
      const shouldAddGE = geCalculationAnswer?.includes('addieren') || !geCalculationAnswer;
      
      if (shouldAddGE) {
        weCount = weNum + geNum;
      } else {
        weCount = Math.max(weNum, geNum, 1);
      }
    }
    if (!weCount) weCount = 1;

    const etage = val(row, 'floor').trim() || undefined;
    const lage = val(row, 'position').trim() || undefined;
    const unitNote = val(row, 'unit_note').trim() || undefined;
    const status = val(row, 'status').trim() || 'Offen';
    const notizAdresse = val(row, 'address_notes').trim() || undefined;
    const notizWE = val(row, 'unit_notes').trim() || undefined;

    // Parse coordinates if present
    let lat: number | null = null;
    let lng: number | null = null;
    const latRaw = val(row, 'latitude');
    const lngRaw = val(row, 'longitude');
    if (latRaw) {
      const parsed = parseFloat(latRaw.replace(',', '.'));
      if (!Number.isNaN(parsed)) lat = parsed;
    }
    if (lngRaw) {
      const parsed = parseFloat(lngRaw.replace(',', '.'));
      if (!Number.isNaN(parsed)) lng = parsed;
    }

    addresses.push({
      street,
      houseNumber,
      postalCode,
      city,
      locality,
      weCount,
      status,
      etage,
      lage,
      unitNote,
      notizAdresse,
      notizWE,
      coordinates: { lat, lng }
    });
  }

  return addresses;
}
