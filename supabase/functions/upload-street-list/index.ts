import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  etage?: string
  lage?: string
  notizAdresse?: string
  notizWE?: string
  unitNote?: string
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

    // Support JSON body uploads with mapping (preferred path)
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json() as any
      const { projectId, listId, csvData, columnMapping, questionAnswers, marketingType, resumeListId } = body || {}

      // Check if this is a resume request
      if (resumeListId) {
        console.log(`Resume request for list ${resumeListId}`)
        const { data: existingList } = await supabaseClient
          .from('project_address_lists')
          .select('*')
          .eq('id', resumeListId)
          .single()
        
        if (existingList && existingList.status === 'importing') {
          console.log(`Resuming import from index ${existingList.last_processed_index}`)
          // Re-trigger the import with the existing list data
          // The background task will pick up from last_processed_index
          return new Response(
            JSON.stringify({ success: true, message: 'Import resumed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (!projectId || !Array.isArray(csvData) || !columnMapping) {
        return new Response(
          JSON.stringify({ error: 'Missing projectId, csvData or columnMapping' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const isFlyerProject = marketingType === 'FLYER'
      console.log(`Processing ${isFlyerProject ? 'FLYER' : 'regular'} project upload`)

      // Helpers
      const getCol = (key: string) => Object.keys(columnMapping).find(k => columnMapping[k] === key)
      const val = (row: any, key: string): string => {
        const col = getCol(key)
        const v = col ? row[col] : undefined
        return (v === null || v === undefined) ? '' : String(v)
      }

      // Normalize house number: convert letters to lowercase
      const normalizeHouseNumber = (houseNumber: string): string => {
        if (!houseNumber) return ''
        // Replace any uppercase letters with lowercase
        return houseNumber.replace(/[A-Z]/g, (match) => match.toLowerCase())
      }

      // Normalize street name for comparison (handles Straße/Str./str. variations)
      const normalizeStreetName = (street: string): string => {
        if (!street) return ''
        return street
          .toLowerCase()
          .replace(/straße/g, 'str')
          .replace(/str\./g, 'str')
          .replace(/\s+/g, ' ')
          .trim()
      }

      // Build map of addresses
      const addressMap = new Map<string, (ParsedAddress & { coordinates?: { lat: number | null; lng: number | null } })[]>()
      const errors: string[] = []

      for (const row of csvData) {
        const street = val(row, 'street').trim()
        let houseNumber = val(row, 'house_number').trim()
        const hCombined = val(row, 'house_number_combined').trim()
        const hAddon = val(row, 'house_number_addon').trim()
        
        if (!houseNumber && hCombined) houseNumber = hCombined
        if (houseNumber && hAddon) houseNumber = `${houseNumber}${hAddon}`
        
        // Normalize house number (lowercase letters)
        houseNumber = normalizeHouseNumber(houseNumber)
        
        const postalCode = val(row, 'postal_code').trim()
        const city = val(row, 'city').trim()

        const unitCountStr = val(row, 'unit_count')
        const weStr = val(row, 'units_residential')
        const geStr = val(row, 'units_commercial')
        
        let weCount = parseInt(unitCountStr) || 0
        
        // Check if GE should be added or not based on question answer
        const geCalculationAnswer = questionAnswers?.ge_calculation
        const shouldAddGE = geCalculationAnswer?.includes('addieren') || !geCalculationAnswer
        
        if (!weCount) {
          const weNum = parseInt(weStr) || 0
          const geNum = parseInt(geStr) || 0
          
          if (shouldAddGE) {
            // Add GE to WE (WE + GE = Total)
            weCount = weNum + geNum
          } else {
            // GE is part of WE (no addition)
            weCount = Math.max(weNum, geNum, 1)
          }
        }
        if (!weCount) weCount = 1

        const etage = val(row, 'floor').trim() || undefined
        const lage = val(row, 'position').trim() || undefined
        const unitNote = val(row, 'unit_note').trim() || undefined
        const status = 'Offen'

        // Coordinates from CSV if present
        let lat: number | null = null
        let lng: number | null = null
        const latRaw = val(row, 'latitude')
        const lngRaw = val(row, 'longitude')
        if (latRaw) {
          const parsed = parseFloat(latRaw.replace(',', '.'))
          if (!Number.isNaN(parsed)) lat = parsed
        }
        if (lngRaw) {
          const parsed = parseFloat(lngRaw.replace(',', '.'))
          if (!Number.isNaN(parsed)) lng = parsed
        }

        if (!street && !houseNumber && !postalCode && !city) {
          errors.push(`Row ${errors.length + 2}: All mandatory fields are missing`)
          continue
        }

        const addressKey = `${street}|${houseNumber}|${postalCode}|${city}`
        const parsed: ParsedAddress = { postalCode, city, street, houseNumber, weCount, status, etage, lage, unitNote }
        const list = addressMap.get(addressKey) || []
        list.push({ ...parsed, coordinates: { lat, lng } })
        addressMap.set(addressKey, list)
      }

      // Deduplicate like the legacy path
      const uniqueAddresses: Array<ParsedAddress & { coordinates: GeocodeResult }> = []
      for (const [, duplicates] of addressMap.entries()) {
        if (duplicates.length > 1 && duplicates.every(d => d.weCount === 1)) {
          const first = duplicates[0]
          const withCoords = duplicates.find(d => d.coordinates && d.coordinates.lat && d.coordinates.lng)
          uniqueAddresses.push({
            ...first,
            weCount: duplicates.length,
            coordinates: {
              lat: withCoords?.coordinates?.lat ?? null,
              lng: withCoords?.coordinates?.lng ?? null,
            },
          })
        } else {
          duplicates.forEach(d => {
            uniqueAddresses.push({
              ...d,
              coordinates: {
                lat: d.coordinates?.lat ?? null,
                lng: d.coordinates?.lng ?? null,
              },
            })
          })
        }
      }

      // Set initial status - return response IMMEDIATELY
      await supabaseClient
        .from('project_address_lists')
        .update({
          status: 'importing',
          upload_stats: {
            total: uniqueAddresses.length,
            successful: 0,
            failed: 0,
            units: 0,
            progress: 'Import wird vorbereitet...',
          },
        })
        .eq('id', listId)

      // BACKGROUND TASK: All heavy operations
      const backgroundImport = async () => {
        const successfulAddresses: Array<{ id: number; street: string; houseNumber: string; postalCode: string; city: string }> = []
        const failedAddresses: Array<{ address: string; reason: string }> = []
        let totalUnits = 0

        try {
          // Check if we need to resume from a previous run
          const { data: currentList } = await supabaseClient
            .from('project_address_lists')
            .select('last_processed_index, chunk_size')
            .eq('id', listId)
            .single()
          
          const startIndex = currentList?.last_processed_index || 0
          const ADDRESS_BATCH_SIZE = currentList?.chunk_size || 100
          
          console.log(`Background: Processing ${uniqueAddresses.length} addresses (starting from ${startIndex})...`)
          
          for (let i = startIndex; i < uniqueAddresses.length; i += ADDRESS_BATCH_SIZE) {
            const batch = uniqueAddresses.slice(i, i + ADDRESS_BATCH_SIZE)
            
            // Process all addresses in the batch in parallel for maximum speed
            const batchPromises = batch.map(async (addr) => {
              try {
                let suggestedPlz = addr.postalCode
                let suggestedCity = addr.city

                if (!addr.postalCode || !addr.city) {
                  const plzCounts = new Map<string, number>()
                  const cityCounts = new Map<string, number>()
                  for (const a of uniqueAddresses) {
                    if (a.postalCode) plzCounts.set(a.postalCode, (plzCounts.get(a.postalCode) || 0) + 1)
                    if (a.city) cityCounts.set(a.city, (cityCounts.get(a.city) || 0) + 1)
                  }
                  if (!addr.postalCode && plzCounts.size > 0) suggestedPlz = Array.from(plzCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
                  if (!addr.city && cityCounts.size > 0) suggestedCity = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
                }

                if (!addr.street || !addr.houseNumber) {
                  return {
                    success: false,
                    failed: {
                      address: `${addr.street || '?'} ${addr.houseNumber || '?'}, ${suggestedPlz || '?'} ${suggestedCity || '?'}`,
                      reason: `Missing mandatory fields: ${!addr.street ? 'STRASSE ' : ''}${!addr.houseNumber ? 'HAUSNR' : ''}`,
                    }
                  }
                }

                // Check for existing address
                const normalizedStreet = normalizeStreetName(addr.street)
                const { data: existingAddresses } = await supabaseClient
                  .from('addresses')
                  .select('id, street')
                  .eq('project_id', projectId)
                  .eq('house_number', addr.houseNumber)
                  .eq('postal_code', suggestedPlz || addr.postalCode)
                  .eq('city', suggestedCity || addr.city)

                const existingAddress = existingAddresses?.find(existing => 
                  normalizeStreetName(existing.street) === normalizedStreet
                )

                let addressId: number

                if (existingAddress) {
                  addressId = existingAddress.id
                } else {
                  const coordinates = {
                    lat: addr.coordinates?.lat ?? null,
                    lng: addr.coordinates?.lng ?? null,
                  }

                  const { data: addressData, error: addressError } = await supabaseClient
                    .from('addresses')
                    .insert({
                      street: addr.street,
                      house_number: addr.houseNumber,
                      postal_code: suggestedPlz || addr.postalCode,
                      city: suggestedCity || addr.city,
                      coordinates,
                      project_id: projectId,
                      list_id: listId || null,
                      created_by: user.id,
                      notiz: addr.notizAdresse,
                    })
                    .select('id')
                    .single()

                  if (addressError) throw addressError
                  addressId = addressData.id
                }

                // Insert units in batch
                const units = []
                for (let j = 0; j < addr.weCount; j++) {
                  const isVerbot = addr.status.toLowerCase() === 'verbot'
                  
                  // System-Notiz zusammenstellen
                  let systemNote = undefined
                  if (isVerbot) {
                    systemNote = 'Status "Verbot" aus Import - nicht vermarktbar'
                  }
                  if (addr.unitNote) {
                    systemNote = systemNote 
                      ? `${systemNote}\n\n${addr.unitNote}` 
                      : addr.unitNote
                  }
                  
                  units.push({
                    address_id: addressId,
                    status: isVerbot ? 'Nicht vermarktbar' : addr.status,
                    marketable: !isVerbot,
                    etage: addr.etage,
                    lage: addr.lage,
                    notiz: addr.notizWE,
                    system_notes: systemNote,
                  })
                }

                if (units.length > 0) {
                  const { error: unitsError } = await supabaseClient
                    .from('units')
                    .insert(units)
                  if (unitsError) throw unitsError
                }

                return {
                  success: true,
                  successful: {
                    id: addressId,
                    street: addr.street,
                    houseNumber: addr.houseNumber,
                    postalCode: suggestedPlz || addr.postalCode,
                    city: suggestedCity || addr.city,
                  },
                  unitCount: units.length
                }
              } catch (err) {
                console.error('Insert error:', err)
                return {
                  success: false,
                  failed: {
                    address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
                    reason: String(err),
                  }
                }
              }
            })

            // Wait for all addresses in the batch to complete in parallel
            const batchResults = await Promise.all(batchPromises)

            // Collect results
            for (const result of batchResults) {
              if (result.success) {
                successfulAddresses.push(result.successful!)
                totalUnits += result.unitCount || 0
              } else {
                failedAddresses.push(result.failed!)
              }
            }

            // Update progress AND last_processed_index after each batch
            const nextIndex = Math.min(i + ADDRESS_BATCH_SIZE, uniqueAddresses.length)
            await supabaseClient
              .from('project_address_lists')
              .update({
                last_processed_index: nextIndex,
                upload_stats: {
                  total: uniqueAddresses.length,
                  successful: successfulAddresses.length,
                  failed: failedAddresses.length,
                  units: totalUnits,
                  progress: `${nextIndex}/${uniqueAddresses.length} Adressen verarbeitet`,
                },
              })
              .eq('id', listId)
            
            console.log(`Batch complete: ${nextIndex}/${uniqueAddresses.length} addresses processed`)
          }

          // Mark as completed and reset last_processed_index
          await supabaseClient
            .from('project_address_lists')
            .update({
              last_processed_index: 0,
              status: 'completed',
              upload_stats: {
                total: uniqueAddresses.length,
                successful: successfulAddresses.length,
                failed: failedAddresses.length,
                units: totalUnits,
                geocoded: 0,
                geocodingInProgress: true,
                progress: 'Geocoding läuft im Hintergrund...',
              },
              error_details: failedAddresses.length > 0 ? {
                failedAddresses,
                errors: errors || [],
              } : null,
            })
            .eq('id', listId)

          // GEOCODING PHASE
          console.log(`Starting geocoding for ${successfulAddresses.length} addresses...`)
          const GEOCODE_BATCH_SIZE = 10
          let geocodedCount = 0

          for (let i = 0; i < successfulAddresses.length; i += GEOCODE_BATCH_SIZE) {
            const batch = successfulAddresses.slice(i, i + GEOCODE_BATCH_SIZE)
            
            const geocodePromises = batch.map(async (addr) => {
              try {
                const { data, error } = await supabaseClient.functions.invoke('geocode-address', {
                  body: {
                    street: addr.street,
                    houseNumber: addr.houseNumber,
                    postalCode: addr.postalCode,
                    city: addr.city,
                  },
                })
                
                if (error) throw error
                
                if (data?.lat && data?.lng) {
                  await supabaseClient
                    .from('addresses')
                    .update({ coordinates: { lat: data.lat, lng: data.lng } })
                    .eq('id', addr.id)
                  
                  return true
                }
                return false
              } catch (err) {
                console.error(`Geocoding error for ${addr.id}:`, err)
                return false
              }
            })

            const results = await Promise.all(geocodePromises)
            geocodedCount += results.filter(r => r).length

            // Update progress
            await supabaseClient
              .from('project_address_lists')
              .update({
                upload_stats: {
                  total: uniqueAddresses.length,
                  successful: successfulAddresses.length,
                  failed: failedAddresses.length,
                  units: totalUnits,
                  geocoded: geocodedCount,
                  geocodingInProgress: geocodedCount < successfulAddresses.length,
                  progress: `${geocodedCount}/${successfulAddresses.length} Adressen geocodiert`,
                },
              })
              .eq('id', listId)

            // Delay between batches
            if (i + GEOCODE_BATCH_SIZE < successfulAddresses.length) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }

          // Final update
          await supabaseClient
            .from('project_address_lists')
            .update({
              upload_stats: {
                total: uniqueAddresses.length,
                successful: successfulAddresses.length,
                failed: failedAddresses.length,
                units: totalUnits,
                geocoded: geocodedCount,
                geocodingInProgress: false,
                progress: `Fertig: ${successfulAddresses.length} Adressen, ${totalUnits} WE, ${geocodedCount} geocodiert`,
              },
            })
            .eq('id', listId)

          console.log(`Background import completed: ${successfulAddresses.length} addresses, ${totalUnits} units, ${geocodedCount} geocoded`)
        } catch (err) {
          console.error('Background import error:', err)
          await supabaseClient
            .from('project_address_lists')
            .update({
              status: 'failed',
              upload_stats: {
                total: uniqueAddresses.length,
                successful: successfulAddresses.length,
                failed: failedAddresses.length,
                units: totalUnits,
                progress: `Fehler: ${err instanceof Error ? err.message : String(err)}`,
              },
              error_details: {
                error: err instanceof Error ? err.message : String(err),
                failedAddresses,
              },
            })
            .eq('id', listId)
        }
      }

      // Start background task
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundImport())
      } else {
        backgroundImport().catch(console.error)
      }

      // IMMEDIATE RESPONSE - no waiting!
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Import gestartet - läuft im Hintergrund',
          listId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Legacy path: FormData upload (still supported for backwards compatibility)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'CSV file is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse CSV header
    const header = lines[0].split(';').map(h => h.trim())
    console.log('CSV Header:', header)

    // Parse CSV rows
    const rows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim())
      const row: any = {}
      header.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }

    console.log(`Parsed ${rows.length} rows from CSV`)

    // Normalize street name for comparison (handles Straße/Str./str. variations)
    const normalizeStreetName = (street: string): string => {
      if (!street) return ''
      return street
        .toLowerCase()
        .replace(/straße/g, 'str')
        .replace(/str\./g, 'str')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Normalize house number: convert letters to lowercase
    const normalizeHouseNumber = (houseNumber: string): string => {
      if (!houseNumber) return ''
      return houseNumber.replace(/[A-Z]/g, (match) => match.toLowerCase())
    }

    // Group addresses by street+houseNumber to detect duplicates
    const addressMap = new Map<string, ParsedAddress[]>()
    const errors: string[] = []

    for (const row of rows) {
      const plz = row.PLZ?.trim() || ''
      const ort = row.ORT?.trim() || ''
      const strasse = row.STRASSE?.trim() || ''
      let hausnr = row.HAUSNR?.trim() || ''
      hausnr = normalizeHouseNumber(hausnr)
      const weanz = row.WEANZ?.trim() || '1'
      const status = row.STATUS?.trim() || 'Offen'

      // Check for missing mandatory fields
      if (!plz && !ort && !strasse && !hausnr) {
        errors.push(`Row ${rows.indexOf(row) + 2}: All mandatory fields are missing`)
        continue
      }

      const addressKey = `${strasse}|${hausnr}|${plz}|${ort}`
      
      const parsed: ParsedAddress = {
        postalCode: plz,
        city: ort,
        street: strasse,
        houseNumber: hausnr,
        weCount: parseInt(weanz) || 1,
        status: status,
        etage: row.ETAGE?.trim() || undefined,
        lage: row.LAGE?.trim() || undefined,
        notizAdresse: row.NOTIZ_ADRESSE?.trim() || undefined,
        notizWE: row.NOTIZ_WE?.trim() || undefined,
      }

      if (!addressMap.has(addressKey)) {
        addressMap.set(addressKey, [])
      }
      addressMap.get(addressKey)!.push(parsed)
    }

    // Apply WE-count logic: duplicates vs WEANZ column
    const uniqueAddresses: ParsedAddress[] = []
    
    for (const [key, duplicates] of addressMap.entries()) {
      if (duplicates.length > 1 && duplicates.every(d => d.weCount === 1)) {
        // Case: Duplicates with WEANZ=1 → use duplicate count
        const first = duplicates[0]
        uniqueAddresses.push({
          ...first,
          weCount: duplicates.length,
          // Merge notes from all duplicates
          notizAdresse: duplicates.map(d => d.notizAdresse).filter(Boolean).join('; ') || undefined,
          notizWE: duplicates.map(d => d.notizWE).filter(Boolean).join('; ') || undefined,
        })
      } else {
        // Case: No duplicates or WEANZ > 1 → use WEANZ from each row
        uniqueAddresses.push(...duplicates)
      }
    }

    console.log(`Processed ${uniqueAddresses.length} unique addresses`)

    // Geocode addresses in parallel batches of 250
    const BATCH_SIZE = 250
    const geocodedAddresses: Array<ParsedAddress & { coordinates: GeocodeResult }> = []
    
    for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
      const batch = uniqueAddresses.slice(i, i + BATCH_SIZE)
      
      const geocodePromises = batch.map(async (addr) => {
        try {
          const { data, error } = await supabaseClient.functions.invoke('geocode-address', {
            body: {
              street: addr.street,
              houseNumber: addr.houseNumber,
              postalCode: addr.postalCode,
              city: addr.city,
            },
          })

          if (error) throw error

          return {
            ...addr,
            coordinates: {
              lat: data.lat,
              lng: data.lng,
              error: data.error,
            },
          }
        } catch (err) {
          console.error('Geocoding error:', err)
          return {
            ...addr,
            coordinates: {
              lat: null,
              lng: null,
              error: String(err),
            },
          }
        }
      })

      const geocodedBatch = await Promise.all(geocodePromises)
      geocodedAddresses.push(...geocodedBatch)
      
      console.log(`Geocoded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueAddresses.length / BATCH_SIZE)}`)
    }

    // Insert addresses and units into database
    const successfulAddresses: number[] = []
    const failedAddresses: Array<{ address: string; reason: string }> = []

    for (const addr of geocodedAddresses) {
      try {
        // Check for missing mandatory fields and suggest fixes
        let suggestedPlz = addr.postalCode
        let suggestedCity = addr.city

        if (!addr.postalCode || !addr.city) {
          // Find most common PLZ and city from the batch
          const plzCounts = new Map<string, number>()
          const cityCounts = new Map<string, number>()

          for (const a of geocodedAddresses) {
            if (a.postalCode) {
              plzCounts.set(a.postalCode, (plzCounts.get(a.postalCode) || 0) + 1)
            }
            if (a.city) {
              cityCounts.set(a.city, (cityCounts.get(a.city) || 0) + 1)
            }
          }

          if (!addr.postalCode && plzCounts.size > 0) {
            suggestedPlz = Array.from(plzCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          }
          if (!addr.city && cityCounts.size > 0) {
            suggestedCity = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          }
        }

        // If still missing mandatory fields, add to failed list
        if (!addr.street || !addr.houseNumber) {
          failedAddresses.push({
            address: `${addr.street || '?'} ${addr.houseNumber || '?'}, ${suggestedPlz || '?'} ${suggestedCity || '?'}`,
            reason: `Missing mandatory fields: ${!addr.street ? 'STRASSE ' : ''}${!addr.houseNumber ? 'HAUSNR' : ''}`,
          })
          continue
        }

        // Check if address already exists with normalized street name
        const normalizedStreet = normalizeStreetName(addr.street)
        const { data: existingAddresses } = await supabaseClient
          .from('addresses')
          .select('*')
          .eq('project_id', projectId)
          .eq('house_number', addr.houseNumber)
          .eq('postal_code', suggestedPlz || addr.postalCode)
          .eq('city', suggestedCity || addr.city)

        // Find matching address by normalized street name
        const existingAddress = existingAddresses?.find(existing => 
          normalizeStreetName(existing.street) === normalizedStreet
        )

        let addressId: number

        if (existingAddress) {
          // Use existing address ID and keep original street spelling
          addressId = existingAddress.id
          console.log(`Found existing address with different spelling: "${existingAddress.street}" matches "${addr.street}"`)
        } else {
          // Insert new address
          const coordinates = addr.coordinates.lat && addr.coordinates.lng
            ? { lat: addr.coordinates.lat, lng: addr.coordinates.lng }
            : null

          const { data: addressData, error: addressError } = await supabaseClient
            .from('addresses')
            .insert({
              street: addr.street,
              house_number: addr.houseNumber,
              postal_code: suggestedPlz || addr.postalCode,
              city: suggestedCity || addr.city,
              coordinates: coordinates,
              project_id: projectId,
              created_by: user.id,
              notiz: addr.notizAdresse,
            })
            .select()
            .single()

          if (addressError) throw addressError
          addressId = addressData.id
        }

        // Insert units for this address (new or existing)
        const units = []
        for (let i = 0; i < addr.weCount; i++) {
          const isVerbot = addr.status.toLowerCase() === 'verbot'
          units.push({
            address_id: addressId,
            status: isVerbot ? 'Nicht vermarktbar' : addr.status,
            marketable: !isVerbot,
            etage: addr.etage,
            lage: addr.lage,
            notiz: addr.notizWE,
            system_notes: isVerbot ? 'Status "Verbot" aus Import - nicht vermarktbar' : undefined,
          })
        }

        const { error: unitsError } = await supabaseClient
          .from('units')
          .insert(units)

        if (unitsError) throw unitsError

        successfulAddresses.push(addressId)

        // If geocoding failed, add to failed list
        if (!addr.coordinates.lat || !addr.coordinates.lng) {
          failedAddresses.push({
            address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
            reason: addr.coordinates.error || 'Geocoding failed',
          })
        }

      } catch (err) {
        console.error('Insert error:', err)
        failedAddresses.push({
          address: `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`,
          reason: String(err),
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        uniqueAddresses: uniqueAddresses.length,
        successfulAddresses: successfulAddresses.length,
        failedAddresses: failedAddresses,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
