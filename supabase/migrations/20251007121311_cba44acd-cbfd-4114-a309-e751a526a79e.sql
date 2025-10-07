-- Simplify lauflisten_addresses to be a pure junction table
-- Drop existing table and recreate with only the necessary columns
DROP TABLE IF EXISTS public.lauflisten_addresses CASCADE;

CREATE TABLE public.lauflisten_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  laufliste_id UUID NOT NULL REFERENCES lauflisten(id) ON DELETE CASCADE,
  address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(laufliste_id, address_id)
);

-- Enable RLS
ALTER TABLE public.lauflisten_addresses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Lauflisten addresses are viewable by everyone"
ON public.lauflisten_addresses
FOR SELECT
USING (true);

CREATE POLICY "Users can add addresses to their lauflisten"
ON public.lauflisten_addresses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lauflisten
    WHERE lauflisten.id = lauflisten_addresses.laufliste_id
    AND lauflisten.created_by = auth.uid()
  )
);

CREATE POLICY "Users can remove addresses from their lauflisten"
ON public.lauflisten_addresses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM lauflisten
    WHERE lauflisten.id = lauflisten_addresses.laufliste_id
    AND lauflisten.created_by = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_lauflisten_addresses_laufliste ON lauflisten_addresses(laufliste_id);
CREATE INDEX idx_lauflisten_addresses_address ON lauflisten_addresses(address_id);