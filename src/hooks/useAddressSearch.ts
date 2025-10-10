import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface AddressSearchResult {
  id: number;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  project_id: string | null;
  project_name?: string;
  units: Array<{
    id: string;
    etage?: string;
    lage?: string;
  }>;
}

export const useAddressSearch = (query: string, projectIds?: string[]) => {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: ['address-search', query, projectIds, userRole],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return [];
      }

      let addressQuery = supabase
        .from('addresses')
        .select(`
          id,
          street,
          house_number,
          postal_code,
          city,
          project_id,
          units
        `)
        .or(`street.ilike.%${query}%,city.ilike.%${query}%,postal_code.ilike.%${query}%`)
        .order('street', { ascending: true })
        .limit(20);

      // Role-based filtering
      if (userRole === 'rocket' || userRole === 'project_manager') {
        // Get user's assigned projects
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: projectRockets } = await supabase
            .from('project_rockets')
            .select('project_id')
            .eq('user_id', user.id);

          const { data: managedProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('project_manager_id', user.id);

          const allowedProjectIds = [
            ...(projectRockets?.map(pr => pr.project_id) || []),
            ...(managedProjects?.map(p => p.id) || [])
          ];

          if (allowedProjectIds.length > 0) {
            addressQuery = addressQuery.in('project_id', allowedProjectIds);
          } else {
            // No access to any projects
            return [];
          }
        }
      }

      // Additional project filter
      if (projectIds && projectIds.length > 0) {
        addressQuery = addressQuery.in('project_id', projectIds);
      }

      const { data: addresses, error } = await addressQuery;

      if (error) {
        console.error('Error searching addresses:', error);
        throw error;
      }

      // Fetch project names
      if (addresses && addresses.length > 0) {
        const projectIdsToFetch = [...new Set(addresses.map(a => a.project_id).filter(Boolean))];
        
        if (projectIdsToFetch.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIdsToFetch);

          const projectMap = new Map(projects?.map(p => [p.id, p.name]));

          return addresses.map(addr => ({
            ...addr,
            project_name: addr.project_id ? projectMap.get(addr.project_id) : undefined
          })) as AddressSearchResult[];
        }
      }

      return (addresses as AddressSearchResult[]) || [];
    },
    enabled: query.trim().length >= 2,
  });
};
