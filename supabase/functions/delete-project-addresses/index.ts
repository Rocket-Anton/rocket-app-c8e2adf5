import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { projectId, listId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Delete operation: projectId=${projectId}, listId=${listId || 'ALL'}`);

    let deletedLists = 0;
    let deletedAddresses = 0;
    let deletedUnits = 0;

    if (listId) {
      // Delete specific list (CASCADE will handle addresses + units)
      console.log(`Deleting list ${listId}...`);
      
      // First count what will be deleted
      const { data: addressData } = await supabase
        .from('addresses')
        .select('id', { count: 'exact' })
        .eq('list_id', listId);
      
      if (addressData) {
        deletedAddresses = addressData.length;
        
        // Count units for these addresses
        const addressIds = addressData.map(a => a.id);
        if (addressIds.length > 0) {
          const { count: unitCount } = await supabase
            .from('units')
            .select('id', { count: 'exact', head: true })
            .in('address_id', addressIds);
          
          deletedUnits = unitCount || 0;
        }
      }

      // Delete the list (CASCADE handles the rest)
      const { error: deleteError } = await supabase
        .from('project_address_lists')
        .delete()
        .eq('id', listId);

      if (deleteError) throw deleteError;
      
      deletedLists = 1;
      
      console.log(`Deleted list ${listId}: ${deletedAddresses} addresses, ${deletedUnits} units`);
    } else {
      // Delete all lists in project (CASCADE will handle everything)
      console.log(`Deleting all lists in project ${projectId}...`);
      
      // First get all lists in project
      const { data: listsData } = await supabase
        .from('project_address_lists')
        .select('id')
        .eq('project_id', projectId);
      
      if (listsData && listsData.length > 0) {
        const listIds = listsData.map(l => l.id);
        
        // Count addresses
        const { data: addressData } = await supabase
          .from('addresses')
          .select('id', { count: 'exact' })
          .in('list_id', listIds);
        
        if (addressData) {
          deletedAddresses = addressData.length;
          
          // Count units
          const addressIds = addressData.map(a => a.id);
          if (addressIds.length > 0) {
            const { count: unitCount } = await supabase
              .from('units')
              .select('id', { count: 'exact', head: true })
              .in('address_id', addressIds);
            
            deletedUnits = unitCount || 0;
          }
        }
        
        // Delete all lists (CASCADE handles addresses + units)
        const { error: deleteListsError } = await supabase
          .from('project_address_lists')
          .delete()
          .in('id', listIds);
        
        if (deleteListsError) throw deleteListsError;
        
        deletedLists = listsData.length;
      }
      
      // Also delete any orphaned addresses without list_id in this project
      const { data: orphanedAddresses } = await supabase
        .from('addresses')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)
        .is('list_id', null);
      
      if (orphanedAddresses && orphanedAddresses.length > 0) {
        const orphanedIds = orphanedAddresses.map(a => a.id);
        
        // Count orphaned units
        const { count: orphanedUnitCount } = await supabase
          .from('units')
          .select('id', { count: 'exact', head: true })
          .in('address_id', orphanedIds);
        
        // Delete orphaned addresses (CASCADE handles units)
        const { error: deleteOrphanedError } = await supabase
          .from('addresses')
          .delete()
          .in('id', orphanedIds);
        
        if (deleteOrphanedError) throw deleteOrphanedError;
        
        deletedAddresses += orphanedAddresses.length;
        deletedUnits += (orphanedUnitCount || 0);
      }
      
      console.log(`Deleted all data in project ${projectId}: ${deletedLists} lists, ${deletedAddresses} addresses, ${deletedUnits} units`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          lists: deletedLists,
          addresses: deletedAddresses,
          units: deletedUnits,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
