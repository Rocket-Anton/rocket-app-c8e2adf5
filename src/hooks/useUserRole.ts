import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export type UserRole = 'super_admin' | 'admin' | 'project_manager' | 'rocket' | null;

export const useUserRole = () => {
  const { impersonatedUserId, actualUserId } = useImpersonation();
  const targetUserId = impersonatedUserId || actualUserId;

  return useQuery({
    queryKey: ['user-role', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as UserRole;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!targetUserId,
  });
};

export const useActualUserRole = () => {
  const { actualUserId } = useImpersonation();

  return useQuery({
    queryKey: ['actual-user-role', actualUserId],
    queryFn: async () => {
      if (!actualUserId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', actualUserId)
        .single();

      if (error) {
        console.error('Error fetching actual user role:', error);
        return null;
      }

      return data?.role as UserRole;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!actualUserId,
  });
};
