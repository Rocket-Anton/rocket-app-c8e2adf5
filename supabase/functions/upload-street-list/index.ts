import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CSVRow {
  [key: string]: any;
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
  normalizedKey: string
}

interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
  addressIndex: number;
  addressPreview: string;
}

// ===== ADDRESS NORMALIZATION FUNCTIONS =====

function normalizeStreet(street: string): string {
  if (!street) return '';
  
  let normalized = street.trim();
  const lower = normalized.toLowerCase();
  
  const abbreviations: Record<string, string> = {
    'str.': 'strasse',
    'str ': 'strasse ',
    'straße': 'strasse',
    'stra?e': 'strasse',
    'st.': 'strasse',
  };
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (lower.includes(abbr)) {
      normalized = normalized.replace(new RegExp(abbr, 'gi'), full);
      break;
    }
  }
  
  normalized = normalizeUmlauts(normalized);
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

function normalizeUmlauts(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase();
}

function normalizeHouseNumber(houseNumber: string): string {
  if (!houseNumber) return '';
  
  let normalized = houseNumber.trim().replace(/\s+/g, '');
  normalized = normalized.toLowerCase();
  normalized = normalized.replace(/[\s\-_]/g, '');
  
  return normalized;
}

function createNormalizedKey(
  street: string,
  houseNumber: string,
  postalCode: string,
  city: string
): string {
  const normStreet = normalizeStreet(street);
  const normHouseNumber = normalizeHouseNumber(houseNumber);
  const normPostalCode = postalCode.trim();
  const normCity = normalizeUmlauts(city.trim());
  
  return `${normStreet}_${normHouseNumber}_${normPostalCode}_${normCity}`;
}

function consolidateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const addressMap = new Map<string, ParsedAddress>();
  
  for (const addr of addresses) {
    const key = addr.normalizedKey;
    
    if (addressMap.has(key)) {
      const existing = addressMap.get(key)!;
      existing.weCount += addr.weCount;
    } else {
      addressMap.set(key, { ...addr });
    }
  }
  
  return Array.from(addressMap.values());
}

function validateAddress(
  address: ParsedAddress,
  allAddresses: ParsedAddress[],
  index: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const addressPreview = `${address.street || '?'} ${address.houseNumber || '?'}, ${address.postalCode || '?'} ${address.city || '?'}`;
  
  if (!address.street || address.street.trim().length === 0) {
    errors.push({
      field: 'street',
      message: 'Straße fehlt',
      addressIndex: index,
      addressPreview,
    });
  }
  
  if (!address.houseNumber || address.houseNumber.trim().length === 0) {
    errors.push({
      field: 'houseNumber',
      message: 'Hausnummer fehlt',
      addressIndex: index,
      addressPreview,
    });
  }
  
  if (!address.postalCode || address.postalCode.trim().length === 0) {
    const suggestion = suggestPostalCode(address, allAddresses);
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl fehlt',
      suggestion,
      addressIndex: index,
      addressPreview,
    });
  } else if (!/^\d{5}$/.test(address.postalCode.trim())) {
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl muss 5-stellig sein',
      addressIndex: index,
      addressPreview,
    });
  }
  
  if (!address.city || address.city.trim().length === 0) {
    const suggestion = suggestCity(address, allAddresses);
    errors.push({
      field: 'city',
      message: 'Ort fehlt',
      suggestion,
      addressIndex: index,
      addressPreview,
    });
  }
  
  return errors;
}

function suggestPostalCode(address: ParsedAddress, allAddresses: ParsedAddress[]): string | undefined {
  if (!address.street || !address.city) return undefined;
  
  const normStreet = normalizeStreet(address.street);
  const normCity = normalizeUmlauts(address.city);
  
  const matches = allAddresses.filter(a => 
    a.postalCode && 
    /^\d{5}$/.test(a.postalCode) &&
    normalizeStreet(a.street) === normStreet &&
    normalizeUmlauts(a.city) === normCity
  );
  
  if (matches.length > 0) {
    const plzCounts = new Map<string, number>();
    for (const match of matches) {
      const count = plzCounts.get(match.postalCode) || 0;
      plzCounts.set(match.postalCode, count + 1);
    }
    
    let maxCount = 0;
    let mostCommonPlz = '';
    for (const [plz, count] of plzCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPlz = plz;
      }
    }
    
    return mostCommonPlz;
  }
  
  return undefined;
}

function suggestCity(address: ParsedAddress, allAddresses: ParsedAddress[]): string | undefined {
  if (!address.street || !address.postalCode) return undefined;
  
  const normStreet = normalizeStreet(address.street);
  const postalCode = address.postalCode.trim();
  
  const matches = allAddresses.filter(a => 
    a.city && 
    a.city.trim().length > 0 &&
    normalizeStreet(a.street) === normStreet &&
    a.postalCode === postalCode
  );
  
  if (matches.length > 0) {
    const cityCounts = new Map<string, number>();
    for (const match of matches) {
      const count = cityCounts.get(match.city) || 0;
      cityCounts.set(match.city, count + 1);
    }
    
    let maxCount = 0;
    let mostCommonCity = '';
    for (const [city, count] of cityCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCity = city;
      }
    }
    
    return mostCommonCity;
  }
  
  return undefined;
}

// ===== ADDRESS PARSING =====

function parseAddressesFromCSV(
  csvData: CSVRow[],
  columnMapping: Record<string, string>,
  questionAnswers: Record<string, string> | null
): ParsedAddress[] {
  console.log(`Parsing ${csvData.length} rows with mapping:`, columnMapping);
  
  const addresses: ParsedAddress[] = [];
  
  const streetCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'street');
  const houseNumberCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'house_number');
  const houseNumberCombinedCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'house_number_combined');
  const postalCodeCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'postal_code');
  const cityCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'city');
  const localityCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'locality');
  const unitCountCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'unit_count');
  const unitsResidentialCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'units_residential');
  const unitsCommercialCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'units_commercial');
  const etageCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'floor');
  const lageCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'position');
  
  for (const row of csvData) {
    const street = streetCol ? String(row[streetCol] || '').trim() : '';
    let houseNumber = '';
    
    if (houseNumberCombinedCol) {
      houseNumber = String(row[houseNumberCombinedCol] || '').trim();
    } else if (houseNumberCol) {
      houseNumber = String(row[houseNumberCol] || '').trim();
    }
    
    const postalCode = postalCodeCol ? String(row[postalCodeCol] || '').trim() : '';
    const city = cityCol ? String(row[cityCol] || '').trim() : '';
    const locality = localityCol ? String(row[localityCol] || '').trim() : '';
    
    let weCount = 1;
    
    if (unitCountCol) {
      const count = parseInt(String(row[unitCountCol] || '1'), 10);
      weCount = isNaN(count) ? 1 : count;
    } else {
      const weResidential = unitsResidentialCol ? parseInt(String(row[unitsResidentialCol] || '0'), 10) : 0;
      const weCommercial = unitsCommercialCol ? parseInt(String(row[unitsCommercialCol] || '0'), 10) : 0;
      
      const addGE = questionAnswers?.['ge_calculation'] === 'GE zu WE addieren (WE + GE = Gesamt)';
      
      if (addGE) {
        weCount = (isNaN(weResidential) ? 0 : weResidential) + (isNaN(weCommercial) ? 0 : weCommercial);
      } else {
        weCount = isNaN(weResidential) ? 0 : weResidential;
      }
      
      if (weCount === 0) weCount = 1;
    }
    
    const normalizedKey = createNormalizedKey(street, houseNumber, postalCode, city);
    
    addresses.push({
      street,
      houseNumber,
      postalCode,
      city,
      locality,
      weCount,
      status: 'Offen',
      etage: etageCol ? String(row[etageCol] || '').trim() : undefined,
      lage: lageCol ? String(row[lageCol] || '').trim() : undefined,
      notizAdresse: '',
      notizWE: '',
      normalizedKey,
    });
  }
  
  console.log(`Parsed ${addresses.length} addresses`);
  return addresses;
}

// ===== MAIN HANDLER =====

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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requestData = await req.json();
    const { 
      projectId, 
      listId,
      csvData, 
      columnMapping, 
      questionAnswers,
    } = requestData;

    if (!projectId || !listId || !Array.isArray(csvData) || !columnMapping) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PHASE 1] Starting validation for list ${listId}`);

    // Parse addresses
    const rawAddresses = parseAddressesFromCSV(csvData, columnMapping, questionAnswers);
    
    // Consolidate duplicates and determine WE logic
    const consolidatedAddresses = consolidateAddresses(rawAddresses);
    
    console.log(`[PHASE 1] Consolidated ${rawAddresses.length} rows into ${consolidatedAddresses.length} unique addresses`);
    
    // Validate all addresses
    const allErrors: ValidationError[] = [];
    consolidatedAddresses.forEach((addr, index) => {
      const errors = validateAddress(addr, consolidatedAddresses, index);
      allErrors.push(...errors);
    });
    
    if (allErrors.length > 0) {
      console.log(`[PHASE 1] Found ${allErrors.length} validation errors`);
      
      await supabaseClient
        .from('project_address_lists')
        .update({
          status: 'validation_required',
          error_details: { validationErrors: allErrors },
          upload_stats: {
            total: consolidatedAddresses.length,
            successful: 0,
            failed: allErrors.length,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', listId);
      
      return new Response(
        JSON.stringify({ 
          message: 'Validation required',
          errors: allErrors,
          listId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // No errors - proceed with import
    console.log(`[PHASE 2] Starting sequential import for ${consolidatedAddresses.length} addresses`);
    
    await supabaseClient
      .from('project_address_lists')
      .update({
        status: 'importing',
        last_progress_at: new Date().toISOString(),
        upload_stats: {
          total: consolidatedAddresses.length,
          successful: 0,
          failed: 0,
          units: 0,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', listId);
    
    // Sequential import
    let successCount = 0;
    let failCount = 0;
    let totalUnits = 0;
    const failedAddresses: any[] = [];
    
    for (let i = 0; i < consolidatedAddresses.length; i++) {
      const addr = consolidatedAddresses[i];
      
      try {
        const { data: insertedAddress, error: insertError } = await supabaseClient
          .from('addresses')
          .insert({
            street: addr.street,
            house_number: addr.houseNumber,
            postal_code: addr.postalCode,
            city: addr.city,
            locality: addr.locality || '',
            coordinates: { lat: null, lng: null },
            project_id: projectId,
            list_id: listId,
            notiz: addr.notizAdresse || '',
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to insert address ${i}:`, insertError);
          failCount++;
          failedAddresses.push({
            address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
            reason: insertError.message,
          });
          continue;
        }

        // Create units
        if (addr.weCount > 0) {
          const unitsToInsert = [];
          for (let j = 0; j < addr.weCount; j++) {
            unitsToInsert.push({
              address_id: insertedAddress.id,
              etage: addr.etage || '',
              lage: addr.lage || '',
              notiz: addr.notizWE || '',
              marketable: true,
              status: 'Offen',
            });
          }

          const { error: unitsError } = await supabaseClient
            .from('units')
            .insert(unitsToInsert);

          if (unitsError) {
            console.error('Failed to insert units:', unitsError);
          } else {
            totalUnits += unitsToInsert.length;
          }
        }

        successCount++;
        
        // Update progress every 10 addresses
        if (i % 10 === 0 || i === consolidatedAddresses.length - 1) {
          await supabaseClient
            .from('project_address_lists')
            .update({
              last_progress_at: new Date().toISOString(),
              last_processed_index: i + 1,
              upload_stats: {
                total: consolidatedAddresses.length,
                successful: successCount,
                failed: failCount,
                units: totalUnits,
              },
            })
            .eq('id', listId);
        }
      } catch (error: any) {
        console.error(`Error processing address ${i}:`, error);
        failCount++;
        failedAddresses.push({
          address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
          reason: error.message,
        });
      }
    }
    
    console.log(`[PHASE 2] Import complete: ${successCount} successful, ${failCount} failed`);
    
    // Update final status
    const finalStatus = failCount > 0 ? 'import_completed_with_errors' : 'ready_for_geocoding';
    
    await supabaseClient
      .from('project_address_lists')
      .update({
        status: finalStatus,
        last_progress_at: new Date().toISOString(),
        upload_stats: {
          total: consolidatedAddresses.length,
          successful: successCount,
          failed: failCount,
          units: totalUnits,
        },
        error_details: failedAddresses.length > 0 ? { failedAddresses } : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listId);
    
    return new Response(
      JSON.stringify({ 
        message: 'Import completed',
        status: finalStatus,
        stats: {
          total: consolidatedAddresses.length,
          successful: successCount,
          failed: failCount,
          units: totalUnits,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
