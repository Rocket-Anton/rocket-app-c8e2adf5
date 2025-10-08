-- Add marketable column to units table
ALTER TABLE public.units 
ADD COLUMN marketable boolean NOT NULL DEFAULT true;

-- Add index for faster queries on non-marketable units
CREATE INDEX idx_units_marketable ON public.units(marketable);

-- Add comment
COMMENT ON COLUMN public.units.marketable IS 'Indicates if the unit can be marketed. False for units with "Verbot" status.';