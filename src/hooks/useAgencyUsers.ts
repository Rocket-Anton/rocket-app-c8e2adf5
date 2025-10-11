import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAgencyUsers = (agencyOwnerId?: string) => {
  return useQuery({
    queryKey: ['agency-users', agencyOwnerId],
    queryFn: async () => {
      if (!agencyOwnerId) return [];

      const { data: extendedRoles, error } = await supabase
        .from('user_extended_roles')
        .select(`
          user_id,
          profiles:user_id (
            id,
            name,
            first_name,
            last_name,
            avatar_url,
            color,
            created_at
          )
        `)
        .eq('managed_by_agency_id', agencyOwnerId);

      if (error) {
        console.error('Error fetching agency users:', error);
        return [];
      }

      return extendedRoles
        .map((role: any) => role.profiles)
        .filter(Boolean);
    },
    enabled: !!agencyOwnerId,
    staleTime: 1000 * 60 * 5,
  });
};
