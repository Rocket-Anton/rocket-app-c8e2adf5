import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExtendedRole {
  id: string;
  user_id: string;
  project_manager_enabled: boolean;
  affiliate_enabled: boolean;
  agency_enabled: boolean;
  whitelabel_enabled: boolean;
  referral_code: string | null;
  referred_by: string | null;
  managed_by_agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useExtendedRole = (userId?: string) => {
  return useQuery({
    queryKey: ['extended-role', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_extended_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching extended role:', error);
        return null;
      }

      return data as ExtendedRole | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export interface AgencySettings {
  id: string;
  agency_owner_id: string;
  custom_user_label: string;
  custom_user_label_plural: string;
  show_financial_data: boolean;
  show_commissions: boolean;
  show_invoices: boolean;
  custom_logo_url: string | null;
  custom_primary_color: string;
  custom_company_name: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgencySettings = (agencyOwnerId?: string) => {
  return useQuery({
    queryKey: ['agency-settings', agencyOwnerId],
    queryFn: async () => {
      if (!agencyOwnerId) return null;

      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('agency_owner_id', agencyOwnerId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching agency settings:', error);
        return null;
      }

      return data as AgencySettings | null;
    },
    enabled: !!agencyOwnerId,
    staleTime: 1000 * 60 * 5,
  });
};
