-- Create units table for individual WEs
CREATE TABLE IF NOT EXISTS public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_id integer NOT NULL,
  status text NOT NULL DEFAULT 'Offen',
  etage text,
  lage text,
  notiz text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add notiz field to addresses table
ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS notiz text;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_units_address_id ON public.units(address_id);

-- Enable RLS on units table
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for units table
CREATE POLICY "Users can view units of their addresses"
ON public.units
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = units.address_id
    AND (
      addresses.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.lauflisten_addresses la
        JOIN public.lauflisten l ON l.id = la.laufliste_id
        WHERE la.address_id = addresses.id
        AND (l.created_by = auth.uid() OR l.assigned_to = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can create units for their addresses"
ON public.units
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = units.address_id
    AND addresses.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update units of their addresses"
ON public.units
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = units.address_id
    AND addresses.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete units of their addresses"
ON public.units
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = units.address_id
    AND addresses.created_by = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();