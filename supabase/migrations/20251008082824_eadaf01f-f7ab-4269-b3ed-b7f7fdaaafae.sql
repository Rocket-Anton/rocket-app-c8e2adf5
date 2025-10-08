-- Create provider_contacts table
CREATE TABLE public.provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.provider_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_contacts
CREATE POLICY "Admins can view all provider contacts"
ON public.provider_contacts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert provider contacts"
ON public.provider_contacts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update provider contacts"
ON public.provider_contacts FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete provider contacts"
ON public.provider_contacts FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create tariffs table
CREATE TABLE public.tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  commission_rocket NUMERIC,
  commission_sales_partner NUMERIC,
  commission_recruiter NUMERIC,
  commission_project_manager NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all tariffs"
ON public.tariffs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage tariffs"
ON public.tariffs FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create addons table
CREATE TABLE public.addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all addons"
ON public.addons FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage addons"
ON public.addons FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Extend projects table
ALTER TABLE public.projects
ADD COLUMN area_name TEXT,
ADD COLUMN federal_state TEXT,
ADD COLUMN city TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN marketing_type TEXT,
ADD COLUMN provider_contact_id UUID REFERENCES public.provider_contacts(id),
ADD COLUMN rocket_count INTEGER,
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN shift_date DATE,
ADD COLUMN unit_count INTEGER,
ADD COLUMN existing_customer_count INTEGER,
ADD COLUMN saleable_units INTEGER,
ADD COLUMN quota_type TEXT,
ADD COLUMN target_quota NUMERIC,
ADD COLUMN important_info TEXT,
ADD COLUMN project_manager_id UUID REFERENCES auth.users(id),
ADD COLUMN telegram_group_create TEXT,
ADD COLUMN telegram_group_exists TEXT,
ADD COLUMN post_job_booster TEXT,
ADD COLUMN tender_info TEXT,
ADD COLUMN project_with_bonus BOOLEAN DEFAULT false,
ADD COLUMN street_list_url TEXT;

-- Create project_tariffs junction table
CREATE TABLE public.project_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tariff_id UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, tariff_id)
);

ALTER TABLE public.project_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view project tariffs"
ON public.project_tariffs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage project tariffs"
ON public.project_tariffs FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create project_addons junction table
CREATE TABLE public.project_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, addon_id)
);

ALTER TABLE public.project_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view project addons"
ON public.project_addons FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage project addons"
ON public.project_addons FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add indexes
CREATE INDEX idx_provider_contacts_provider_id ON public.provider_contacts(provider_id);
CREATE INDEX idx_tariffs_provider_id ON public.tariffs(provider_id);
CREATE INDEX idx_addons_provider_id ON public.addons(provider_id);
CREATE INDEX idx_project_tariffs_project_id ON public.project_tariffs(project_id);
CREATE INDEX idx_project_addons_project_id ON public.project_addons(project_id);

-- Add trigger for tariffs updated_at
CREATE TRIGGER update_tariffs_updated_at
BEFORE UPDATE ON public.tariffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();