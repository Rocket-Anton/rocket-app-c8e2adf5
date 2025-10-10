-- Add new columns to tariffs table
ALTER TABLE public.tariffs
ADD COLUMN revenue numeric,
ADD COLUMN has_bonus boolean DEFAULT false,
ADD COLUMN bonus_revenue numeric,
ADD COLUMN bonus_rocket numeric,
ADD COLUMN bonus_project_manager numeric,
ADD COLUMN bonus_sales_partner numeric,
ADD COLUMN has_bonus_quota boolean DEFAULT false,
ADD COLUMN bonus_quota_percentage numeric;

-- Update is_active to always default to true
ALTER TABLE public.tariffs
ALTER COLUMN is_active SET DEFAULT true;