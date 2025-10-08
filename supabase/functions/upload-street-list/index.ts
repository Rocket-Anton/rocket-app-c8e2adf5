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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file || !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing file or projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Group addresses by street+houseNumber to detect duplicates
    const addressMap = new Map<string, ParsedAddress[]>()
    const errors: string[] = []

    for (const row of rows) {
      const plz = row.PLZ?.trim() || ''
      const ort = row.ORT?.trim() || ''
      const strasse = row.STRASSE?.trim() || ''
      const hausnr = row.HAUSNR?.trim() || ''
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

        const coordinates = addr.coordinates.lat && addr.coordinates.lng
          ? { lat: addr.coordinates.lat, lng: addr.coordinates.lng }
          : null

        // Insert address
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

        // Insert units
        const units = []
        for (let i = 0; i < addr.weCount; i++) {
          units.push({
            address_id: addressData.id,
            status: addr.status,
            etage: addr.etage,
            lage: addr.lage,
            notiz: addr.notizWE,
          })
        }

        const { error: unitsError } = await supabaseClient
          .from('units')
          .insert(units)

        if (unitsError) throw unitsError

        successfulAddresses.push(addressData.id)

        // If geocoding failed, add to failed list
        if (!coordinates) {
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
