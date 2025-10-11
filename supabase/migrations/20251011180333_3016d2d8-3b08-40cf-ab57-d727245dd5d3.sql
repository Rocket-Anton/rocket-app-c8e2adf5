-- ============================================
-- Phase 1: Erweiterte Rollen & Agency System
-- ============================================

-- 1. Tabelle für erweiterte User-Eigenschaften
CREATE TABLE IF NOT EXISTS public.user_extended_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Erweiterte Rollen-Flags
  project_manager_enabled BOOLEAN DEFAULT false NOT NULL,
  affiliate_enabled BOOLEAN DEFAULT false NOT NULL,
  agency_enabled BOOLEAN DEFAULT false NOT NULL,
  whitelabel_enabled BOOLEAN DEFAULT false NOT NULL,
  
  -- Affiliate System
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Agency System
  managed_by_agency_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_user_extended_roles_user_id ON public.user_extended_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_extended_roles_referral_code ON public.user_extended_roles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_extended_roles_managed_by ON public.user_extended_roles(managed_by_agency_id);
CREATE INDEX IF NOT EXISTS idx_user_extended_roles_referred_by ON public.user_extended_roles(referred_by);

-- 2. Tabelle für Agency-Einstellungen (Branding & Visibility)
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Custom Labels
  custom_user_label TEXT DEFAULT 'Rakete' NOT NULL,
  custom_user_label_plural TEXT DEFAULT 'Raketen' NOT NULL,
  
  -- Sichtbarkeitseinstellungen für Agency Users
  show_financial_data BOOLEAN DEFAULT false NOT NULL,
  show_commissions BOOLEAN DEFAULT false NOT NULL,
  show_invoices BOOLEAN DEFAULT false NOT NULL,
  
  -- White-Label Branding
  custom_logo_url TEXT,
  custom_primary_color TEXT DEFAULT '#3b82f6',
  custom_company_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_settings_owner ON public.agency_settings(agency_owner_id);

-- 3. Tabelle für Custom Provisionen von Agency Users
CREATE TABLE IF NOT EXISTS public.agency_user_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agency_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tarif oder Addon (einer muss gesetzt sein)
  tariff_id UUID REFERENCES public.tariffs(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.addons(id) ON DELETE CASCADE,
  
  -- Custom Provisionen (überschreiben Standard)
  custom_commission_rocket NUMERIC,
  custom_bonus_rocket NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT one_of_tariff_or_addon CHECK (
    (tariff_id IS NOT NULL AND addon_id IS NULL) OR 
    (tariff_id IS NULL AND addon_id IS NOT NULL)
  ),
  UNIQUE(agency_user_id, tariff_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_commissions_user ON public.agency_user_commissions(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_commissions_owner ON public.agency_user_commissions(agency_owner_id);

-- 4. Security Definer Functions

-- Prüft ob User Agency Partner ist
CREATE OR REPLACE FUNCTION public.is_agency_partner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_extended_roles
    WHERE user_id = _user_id AND agency_enabled = true
  );
$$;

-- Prüft ob User Projektleiter ist
CREATE OR REPLACE FUNCTION public.is_project_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_extended_roles
    WHERE user_id = _user_id AND project_manager_enabled = true
  );
$$;

-- Prüft ob User Affiliate ist
CREATE OR REPLACE FUNCTION public.is_affiliate(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_extended_roles
    WHERE user_id = _user_id AND affiliate_enabled = true
  );
$$;

-- Gibt Agency Owner für einen Agency User zurück
CREATE OR REPLACE FUNCTION public.get_agency_owner(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT managed_by_agency_id 
  FROM public.user_extended_roles
  WHERE user_id = _user_id;
$$;

-- 5. RLS Policies für user_extended_roles

ALTER TABLE public.user_extended_roles ENABLE ROW LEVEL SECURITY;

-- Super Admins können alles
CREATE POLICY "Super Admins can manage all extended roles"
ON public.user_extended_roles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- User kann eigene Rolle sehen
CREATE POLICY "Users can view own extended role"
ON public.user_extended_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Agency Partner können ihre Agency Users sehen
CREATE POLICY "Agency partners can view their users"
ON public.user_extended_roles FOR SELECT
TO authenticated
USING (
  managed_by_agency_id = auth.uid() 
  AND is_agency_partner(auth.uid())
);

-- Agency Partner können ihre Agency Users erstellen
CREATE POLICY "Agency partners can create their users"
ON public.user_extended_roles FOR INSERT
TO authenticated
WITH CHECK (
  managed_by_agency_id = auth.uid() 
  AND is_agency_partner(auth.uid())
);

-- Agency Partner können ihre Agency Users bearbeiten
CREATE POLICY "Agency partners can update their users"
ON public.user_extended_roles FOR UPDATE
TO authenticated
USING (
  managed_by_agency_id = auth.uid() 
  AND is_agency_partner(auth.uid())
);

-- 6. RLS Policies für agency_settings

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- Super Admins können alle Settings sehen
CREATE POLICY "Super Admins can view all agency settings"
ON public.agency_settings FOR SELECT
TO authenticated
USING (is_super_admin());

-- Agency Partner können eigene Settings verwalten
CREATE POLICY "Agency partners can manage own settings"
ON public.agency_settings FOR ALL
TO authenticated
USING (agency_owner_id = auth.uid() AND is_agency_partner(auth.uid()))
WITH CHECK (agency_owner_id = auth.uid() AND is_agency_partner(auth.uid()));

-- Agency Users können Settings ihrer Agentur lesen
CREATE POLICY "Agency users can view their agency settings"
ON public.agency_settings FOR SELECT
TO authenticated
USING (
  agency_owner_id = get_agency_owner(auth.uid())
);

-- 7. RLS Policies für agency_user_commissions

ALTER TABLE public.agency_user_commissions ENABLE ROW LEVEL SECURITY;

-- Super Admins können alles sehen
CREATE POLICY "Super Admins can view all agency commissions"
ON public.agency_user_commissions FOR SELECT
TO authenticated
USING (is_super_admin());

-- Agency Partner können eigene Provisionen verwalten
CREATE POLICY "Agency partners can manage their commissions"
ON public.agency_user_commissions FOR ALL
TO authenticated
USING (agency_owner_id = auth.uid() AND is_agency_partner(auth.uid()))
WITH CHECK (agency_owner_id = auth.uid() AND is_agency_partner(auth.uid()));

-- Agency Users können eigene Provisionen sehen
CREATE POLICY "Agency users can view own commissions"
ON public.agency_user_commissions FOR SELECT
TO authenticated
USING (agency_user_id = auth.uid());

-- 8. Updated Trigger für updated_at

CREATE TRIGGER update_user_extended_roles_updated_at
BEFORE UPDATE ON public.user_extended_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_settings_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_user_commissions_updated_at
BEFORE UPDATE ON public.agency_user_commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Update profiles RLS für Projektleiter und Agency Sichtbarkeit

-- Projektleiter können Raketen aus ihren Projekten sehen
CREATE POLICY "Project Managers can view their project rockets"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_project_manager(auth.uid())
  AND EXISTS (
    SELECT 1 
    FROM public.project_rockets pr
    JOIN public.projects p ON p.id = pr.project_id
    WHERE pr.user_id = profiles.id
      AND p.project_manager_id = auth.uid()
  )
);

-- Agency Partner können ihre Agency Users sehen
CREATE POLICY "Agency partners can view their agency users"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_agency_partner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_extended_roles
    WHERE user_id = profiles.id
      AND managed_by_agency_id = auth.uid()
  )
);

-- Affiliates können ihre geworbenen User sehen
CREATE POLICY "Affiliates can view referred users"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_affiliate(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_extended_roles
    WHERE user_id = profiles.id
      AND referred_by = auth.uid()
  )
);