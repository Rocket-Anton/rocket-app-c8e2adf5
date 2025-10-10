-- Neue Spalten für Provisionen und Bonus (wie bei Tarife)
ALTER TABLE public.addons
  ADD COLUMN revenue numeric DEFAULT 0,
  ADD COLUMN commission_rocket numeric DEFAULT 0,
  ADD COLUMN commission_project_manager numeric DEFAULT 0,
  ADD COLUMN commission_sales_partner numeric DEFAULT 0,
  ADD COLUMN has_bonus boolean DEFAULT false,
  ADD COLUMN bonus_revenue numeric DEFAULT 0,
  ADD COLUMN bonus_rocket numeric DEFAULT 0,
  ADD COLUMN bonus_project_manager numeric DEFAULT 0,
  ADD COLUMN bonus_sales_partner numeric DEFAULT 0,
  ADD COLUMN has_bonus_quota boolean DEFAULT false,
  ADD COLUMN bonus_quota_percentage numeric DEFAULT 0,
  ADD COLUMN is_single_option boolean DEFAULT false,
  ADD COLUMN single_option_group text;

-- Index für schnellere Gruppierung
CREATE INDEX idx_addons_single_option_group ON public.addons(single_option_group) 
  WHERE single_option_group IS NOT NULL;