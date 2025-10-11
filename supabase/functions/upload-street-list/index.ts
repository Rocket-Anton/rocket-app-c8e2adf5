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
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  locality?: string;
  weCount: number;
  etage?: string;
  lage?: string;
  notizAdresse?: string;
  notizWE?: string;
  status: string;
  normalizedKey: string;
}

interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

// ========== Address Normalization Functions ==========

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
  allAddresses: ParsedAddress[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!address.street || address.street.trim().length === 0) {
    errors.push({
      field: 'street',
      message: 'Straße fehlt',
    });
  }
  
  if (!address.houseNumber || address.houseNumber.trim().length === 0) {
    errors.push({
      field: 'houseNumber',
      message: 'Hausnummer fehlt',
    });
  }
  
  if (!address.postalCode || address.postalCode.trim().length === 0) {
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl fehlt',
      suggestion: suggestPostalCode(address, allAddresses),
    });
  }
  
  if (!address.city || address.city.trim().length === 0) {
    errors.push({
      field: 'city',
      message: 'Ort fehlt',
      suggestion: suggestCity(address, allAddresses),
    });
  }
  
  if (address.postalCode && !/^\d{5}$/.test(address.postalCode.trim())) {
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl muss 5-stellig sein',
    });
  }
  
  return errors;
}

function suggestPostalCode(
  address: ParsedAddress,
  allAddresses: ParsedAddress[]
): string | undefined {
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

function suggestCity(
  address: ParsedAddress,
  allAddresses: ParsedAddress[]
): string | undefined {
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

// ========== CSV Parsing & WE Logic ==========

function parseAddressesFromCSV(
  csvData: CSVRow[],
  columnMapping: Record<string, string>,
  questionAnswers: Record<string, string> | null
): ParsedAddress[] {
  const addresses: ParsedAddress[] = [];
  
  const streetCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'street');
  const houseNumberCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'house_number');
  const houseNumberCombinedCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'house_number_combined');
  const postalCodeCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'postal_code');
  const cityCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'city');
  const localityCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'locality');
  const unitCountCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'unit_count');
  const floorCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'floor');
  const positionCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'position');
  const customerNumberCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'customer_number');
  const customerNameCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'customer_name');
  const unitNoteCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'unit_note');
  
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
    const locality = localityCol ? String(row[localityCol] || '').trim() : undefined;
    
    let weCount = 1;
    if (unitCountCol) {
      const unitValue = row[unitCountCol];
      if (unitValue && !isNaN(Number(unitValue))) {
        weCount = Math.max(1, parseInt(String(unitValue), 10));
      }
    }
    
    const etage = floorCol ? String(row[floorCol] || '').trim() : undefined;
    const lage = positionCol ? String(row[positionCol] || '').trim() : undefined;
    
    let notizAdresse = '';
    if (customerNumberCol && row[customerNumberCol]) {
      notizAdresse += `Kundennummer: ${row[customerNumberCol]}`;
    }
    if (customerNameCol && row[customerNameCol]) {
      if (notizAdresse) notizAdresse += '; ';
      notizAdresse += `Kunde: ${row[customerNameCol]}`;
    }
    
    const notizWE = unitNoteCol ? String(row[unitNoteCol] || '').trim() : undefined;
    
    const normalizedKey = createNormalizedKey(street, houseNumber, postalCode, city);
    
    addresses.push({
      street,
      houseNumber,
      postalCode,
      city,
      locality,
      weCount,
      etage,
      lage,
      notizAdresse: notizAdresse || undefined,
      notizWE,
      status: 'Offen',
      normalizedKey,
    });
  }
  
  return addresses;
}

// ========== Main Handler ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { projectId, listId, csvData, columnMapping, questionAnswers, resumeListId } = body;

    // RESUME MODE: Continue processing an existing list
    if (resumeListId) {
      console.log(`Resume mode for list ${resumeListId}`);
      
      const { data: listData, error: listFetchError } = await supabase
        .from('project_address_lists')
        .select('*')
        .eq('id', resumeListId)
        .single();
      
      if (listFetchError || !listData) {
        throw new Error('List not found for resume');
      }
      
      if (listData.status !== 'importing') {
        console.log(`List ${resumeListId} is not in importing status, skipping resume`);
        return new Response(
          JSON.stringify({ message: 'List not in importing status' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const payload = listData.import_payload as any;
      if (!payload || !payload.addresses) {
        throw new Error('No import payload found');
      }
      
      const addresses = payload.addresses as ParsedAddress[];
      const lastIndex = listData.last_processed_index || 0;
      const chunkSize = listData.chunk_size || 100;
      const startIdx = lastIndex;
      const endIdx = Math.min(startIdx + chunkSize, addresses.length);
      const chunk = addresses.slice(startIdx, endIdx);
      
      console.log(`Processing chunk ${startIdx}-${endIdx} of ${addresses.length}`);
      
      let successful = (listData.upload_stats as any)?.successful || 0;
      let failed = (listData.upload_stats as any)?.failed || 0;
      let unitsCreated = (listData.upload_stats as any)?.units || 0;
      const failedAddresses: any[] = (listData.error_details as any)?.failedAddresses || [];
      
      for (const addr of chunk) {
        try {
          const { data: insertedAddress, error: addrError } = await supabase
            .from('addresses')
            .insert({
              project_id: listData.project_id,
              list_id: listData.id,
              street: addr.street,
              house_number: addr.houseNumber,
              postal_code: addr.postalCode,
              city: addr.city,
              locality: addr.locality,
              notiz: addr.notizAdresse,
              created_by: listData.created_by,
              coordinates: {},
            })
            .select()
            .single();
          
          if (addrError) throw addrError;
          
          const units = [];
          for (let i = 0; i < addr.weCount; i++) {
            units.push({
              address_id: insertedAddress.id,
              etage: addr.etage,
              lage: addr.lage,
              status: addr.status,
              system_notes: addr.notizWE,
              marketable: true,
            });
          }
          
          if (units.length > 0) {
            const { error: unitsError } = await supabase.from('units').insert(units);
            if (unitsError) throw unitsError;
            unitsCreated += units.length;
          }
          
          successful++;
        } catch (err: any) {
          console.error(`Failed to insert address:`, err);
          failed++;
          failedAddresses.push({
            street: addr.street,
            houseNumber: addr.houseNumber,
            postalCode: addr.postalCode,
            city: addr.city,
            error: err.message,
          });
        }
      }
      
      const newLastIndex = endIdx;
      const isDone = newLastIndex >= addresses.length;
      
      await supabase
        .from('project_address_lists')
        .update({
          last_processed_index: newLastIndex,
          last_progress_at: new Date().toISOString(),
          upload_stats: { successful, failed, units: unitsCreated },
          error_details: failed > 0 ? { failedAddresses } : null,
          status: isDone ? (failed > 0 ? 'import_completed_with_errors' : 'ready_for_geocoding') : 'importing',
        })
        .eq('id', resumeListId);
      
      console.log(`Chunk processed: ${successful} successful, ${failed} failed, ${unitsCreated} units`);
      
      return new Response(
        JSON.stringify({
          success: true,
          processed: newLastIndex,
          total: addresses.length,
          isDone,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // INITIAL MODE: Parse, validate, and start import
    if (!projectId || !listId || !csvData || !columnMapping) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting import for list ${listId}`);

    // Phase 1: Parse & Normalize
    const parsedAddresses = parseAddressesFromCSV(csvData, columnMapping, questionAnswers);
    console.log(`Parsed ${parsedAddresses.length} addresses`);

    // Phase 2: Consolidate duplicates (sum WE)
    const consolidatedAddresses = consolidateAddresses(parsedAddresses);
    console.log(`Consolidated to ${consolidatedAddresses.length} unique addresses`);

    // Phase 3: Validation
    const validationErrors: any[] = [];
    for (const addr of consolidatedAddresses) {
      const errors = validateAddress(addr, consolidatedAddresses);
      if (errors.length > 0) {
        validationErrors.push({
          address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
          errors,
        });
      }
    }

    if (validationErrors.length > 0) {
      console.log(`Validation failed: ${validationErrors.length} addresses with errors`);
      
      await supabase
        .from('project_address_lists')
        .update({
          status: 'validation_required',
          error_details: { validationErrors },
        })
        .eq('id', listId);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Validation required',
          validationErrors,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 4: Start chunked import
    console.log(`Validation passed, starting import`);
    
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const userId = userData.user?.id;
    
    await supabase
      .from('project_address_lists')
      .update({
        status: 'importing',
        last_processed_index: 0,
        last_progress_at: new Date().toISOString(),
        import_payload: { addresses: consolidatedAddresses },
        upload_stats: { successful: 0, failed: 0, units: 0 },
      })
      .eq('id', listId);
    
    // Process first chunk immediately
    const chunkSize = 100;
    const firstChunk = consolidatedAddresses.slice(0, Math.min(chunkSize, consolidatedAddresses.length));
    
    let successful = 0;
    let failed = 0;
    let unitsCreated = 0;
    const failedAddresses: any[] = [];
    
    for (const addr of firstChunk) {
      try {
        const { data: insertedAddress, error: addrError } = await supabase
          .from('addresses')
          .insert({
            project_id: projectId,
            list_id: listId,
            street: addr.street,
            house_number: addr.houseNumber,
            postal_code: addr.postalCode,
            city: addr.city,
            locality: addr.locality,
            notiz: addr.notizAdresse,
            created_by: userId,
            coordinates: {},
          })
          .select()
          .single();
        
        if (addrError) throw addrError;
        
        const units = [];
        for (let i = 0; i < addr.weCount; i++) {
          units.push({
            address_id: insertedAddress.id,
            etage: addr.etage,
            lage: addr.lage,
            status: addr.status,
            system_notes: addr.notizWE,
            marketable: true,
          });
        }
        
        if (units.length > 0) {
          const { error: unitsError } = await supabase.from('units').insert(units);
          if (unitsError) throw unitsError;
          unitsCreated += units.length;
        }
        
        successful++;
      } catch (err: any) {
        console.error(`Failed to insert address:`, err);
        failed++;
        failedAddresses.push({
          street: addr.street,
          houseNumber: addr.houseNumber,
          postalCode: addr.postalCode,
          city: addr.city,
          error: err.message,
        });
      }
    }
    
    const newLastIndex = firstChunk.length;
    const isDone = newLastIndex >= consolidatedAddresses.length;
    
    await supabase
      .from('project_address_lists')
      .update({
        last_processed_index: newLastIndex,
        last_progress_at: new Date().toISOString(),
        upload_stats: { successful, failed, units: unitsCreated },
        error_details: failed > 0 ? { failedAddresses } : null,
        status: isDone ? (failed > 0 ? 'import_completed_with_errors' : 'ready_for_geocoding') : 'importing',
      })
      .eq('id', listId);
    
    console.log(`First chunk processed: ${successful} successful, ${failed} failed, ${unitsCreated} units`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Import started',
        processed: newLastIndex,
        total: consolidatedAddresses.length,
        isDone,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
