-- Fix unit_activities table to work with JSONB-based units
-- Drop the foreign key constraint and change unit_id to allow any identifier
ALTER TABLE public.unit_activities 
  DROP CONSTRAINT IF EXISTS unit_activities_address_id_fkey;

-- Change unit_id from INTEGER to TEXT to store the JSONB unit ID
ALTER TABLE public.unit_activities 
  ALTER COLUMN unit_id TYPE TEXT;

-- Re-add the foreign key for address_id
ALTER TABLE public.unit_activities 
  ADD CONSTRAINT unit_activities_address_id_fkey 
  FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;

-- Update comment
COMMENT ON COLUMN public.unit_activities.unit_id IS 'Unit identifier from JSONB array (stored as text)';