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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Exporting addresses for project: ${projectId}`)

    // Fetch all addresses for the project with units
    const { data: addresses, error: addressError } = await supabaseClient
      .from('addresses')
      .select(`
        id,
        street,
        house_number,
        postal_code,
        city,
        locality,
        coordinates,
        notiz,
        units (
          id,
          status,
          etage,
          lage,
          notiz
        )
      `)
      .eq('project_id', projectId)
      .order('street')
      .order('house_number')

    if (addressError) throw addressError

    console.log(`Found ${addresses?.length || 0} addresses`)

    // Format data for Rocket App
    const csvRows: string[] = []
    
    // Header
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

    // Data rows
    for (const addr of addresses || []) {
      const units = Array.isArray(addr.units) ? addr.units : []
      const unitCount = units.length

      if (unitCount === 0) {
        // Address without units - export once
        csvRows.push([
          addr.street || '',
          addr.house_number || '',
          addr.postal_code || '',
          addr.city || '',
          addr.locality || '',
          '1',
          addr.coordinates?.lat || '',
          addr.coordinates?.lng || '',
          addr.notiz || '',
          'Offen',
          '',
          '',
          ''
        ].join(';'))
      } else if (unitCount === 1) {
        // Single unit - export as one row with unit details
        const unit = units[0]
        csvRows.push([
          addr.street || '',
          addr.house_number || '',
          addr.postal_code || '',
          addr.city || '',
          addr.locality || '',
          '1',
          addr.coordinates?.lat || '',
          addr.coordinates?.lng || '',
          addr.notiz || '',
          unit.status || 'Offen',
          unit.etage || '',
          unit.lage || '',
          unit.notiz || ''
        ].join(';'))
      } else {
        // Multiple units - export as multiple rows (one per unit)
        for (const unit of units) {
          csvRows.push([
            addr.street || '',
            addr.house_number || '',
            addr.postal_code || '',
            addr.city || '',
            addr.locality || '',
            '1',
            addr.coordinates?.lat || '',
            addr.coordinates?.lng || '',
            addr.notiz || '',
            unit.status || 'Offen',
            unit.etage || '',
            unit.lage || '',
            unit.notiz || ''
          ].join(';'))
        }
      }
    }

    const csvContent = csvRows.join('\n')

    console.log(`Generated CSV with ${csvRows.length - 1} rows`)

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rocket-app-export-${projectId}.csv"`,
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
