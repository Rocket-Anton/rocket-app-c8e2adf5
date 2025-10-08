import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { projectId, exportType = 'rocket', listId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Project access denied:', projectError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized or project not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Exporting addresses for project: ${projectId} by user: ${user.id}`)

    // Fetch all addresses for the project with listId filter if provided
    let addressQuery = supabaseClient
      .from('addresses')
      .select('id, street, house_number, postal_code, city, locality, coordinates, notiz, list_id')
      .eq('project_id', projectId)
    
    if (listId) {
      addressQuery = addressQuery.eq('list_id', listId)
    }
    
    const { data: addresses, error: addressError } = await addressQuery
      .order('street')
      .order('house_number')

    if (addressError) throw addressError

    // Fetch units separately for each address
    const addressIds = addresses?.map(a => a.id) || []
    const { data: units, error: unitsError } = await supabaseClient
      .from('units')
      .select('id, address_id, status, etage, lage, notiz')
      .in('address_id', addressIds)
    
    if (unitsError) throw unitsError

    // Group units by address_id
    const unitsByAddress = new Map<number, any[]>()
    for (const unit of units || []) {
      if (!unitsByAddress.has(unit.address_id)) {
        unitsByAddress.set(unit.address_id, [])
      }
      unitsByAddress.get(unit.address_id)!.push(unit)
    }

    console.log(`Found ${addresses?.length || 0} addresses with ${units?.length || 0} units`)

    // Format data based on export type
    const csvRows: string[] = []
    
    if (exportType === 'raw') {
      // Rohdatei export - original format
      csvRows.push([
        'STRASSE',
        'HAUSNR',
        'PLZ',
        'ORT',
        'ORTSCHAFT',
        'WEANZ',
        'LATITUDE',
        'LONGITUDE',
        'NOTIZ_ADRESSE',
        'STATUS',
        'ETAGE',
        'LAGE',
        'NOTIZ_WE'
      ].join(';'))
    } else {
      // Rocket export - format with longitude/latitude at the end
      csvRows.push([
        'PLZ',
        'ORT',
        'STRASSE',
        'HAUSNUMMER',
        'WEANZ',
        'WEBEZ',
        'ETAGE',
        'LAGE',
        'NOTIZ_ADRESSE',
        'NOTIZ_WE',
        'STATUS',
        'VP_ADRESSE',
        'VP_WE',
        'longitude',
        'latitude'
      ].join(';'))
    }

    // Data rows
    for (const addr of addresses || []) {
      const addressUnits = unitsByAddress.get(addr.id) || []
      const unitCount = addressUnits.length

      if (exportType === 'raw') {
        // Rohdatei export - original format
        if (unitCount === 0) {
          csvRows.push([
            addr.street || '',
            addr.house_number || '',
            addr.postal_code || '',
            addr.city || '',
            addr.locality || '',
            '1',
            String(addr.coordinates?.lat || '').replace('.', ','),
            String(addr.coordinates?.lng || '').replace('.', ','),
            addr.notiz || '',
            'Offen',
            '',
            '',
            ''
          ].join(';'))
        } else if (unitCount === 1) {
          const unit = addressUnits[0]
          csvRows.push([
            addr.street || '',
            addr.house_number || '',
            addr.postal_code || '',
            addr.city || '',
            addr.locality || '',
            '1',
            String(addr.coordinates?.lat || '').replace('.', ','),
            String(addr.coordinates?.lng || '').replace('.', ','),
            addr.notiz || '',
            unit.status || 'Offen',
            unit.etage || '',
            unit.lage || '',
            unit.notiz || ''
          ].join(';'))
        } else {
          for (const unit of addressUnits) {
            csvRows.push([
              addr.street || '',
              addr.house_number || '',
              addr.postal_code || '',
              addr.city || '',
              addr.locality || '',
              '1',
              String(addr.coordinates?.lat || '').replace('.', ','),
              String(addr.coordinates?.lng || '').replace('.', ','),
              addr.notiz || '',
              unit.status || 'Offen',
              unit.etage || '',
              unit.lage || '',
              unit.notiz || ''
            ].join(';'))
          }
        }
      } else {
        // Rocket export - format with longitude/latitude at the end
        if (unitCount === 0) {
          csvRows.push([
            addr.postal_code || '',
            addr.city || '',
            addr.street || '',
            addr.house_number || '',
            '1',
            '',
            '',
            '',
            addr.notiz || '',
            '',
            'OFFEN',
            '',
            '',
            String(addr.coordinates?.lng || '').replace('.', ','),
            String(addr.coordinates?.lat || '').replace('.', ',')
          ].join(';'))
        } else if (unitCount === 1) {
          const unit = addressUnits[0]
          csvRows.push([
            addr.postal_code || '',
            addr.city || '',
            addr.street || '',
            addr.house_number || '',
            '1',
            '',
            unit.etage || '',
            unit.lage || '',
            addr.notiz || '',
            unit.notiz || '',
            unit.status || 'OFFEN',
            '',
            '',
            String(addr.coordinates?.lng || '').replace('.', ','),
            String(addr.coordinates?.lat || '').replace('.', ',')
          ].join(';'))
        } else {
          for (const unit of addressUnits) {
            csvRows.push([
              addr.postal_code || '',
              addr.city || '',
              addr.street || '',
              addr.house_number || '',
              '1',
              '',
              unit.etage || '',
              unit.lage || '',
              addr.notiz || '',
              unit.notiz || '',
              unit.status || 'OFFEN',
              '',
              '',
              String(addr.coordinates?.lng || '').replace('.', ','),
              String(addr.coordinates?.lat || '').replace('.', ',')
            ].join(';'))
          }
        }
      }
    }

    console.log(`Generated export with ${csvRows.length - 1} rows`)

    // For raw export, use tab-separated values (Excel compatible)
    if (exportType === 'raw') {
      const tsvContent = csvRows.map(row => row.replace(/;/g, '\t')).join('\n')
      const filename = `rohdatei-export-${projectId}.txt`
      
      return new Response(tsvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Rocket export as CSV
    const csvContent = csvRows.join('\n')
    const filename = `rocket-app-export-${projectId}.csv`

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
