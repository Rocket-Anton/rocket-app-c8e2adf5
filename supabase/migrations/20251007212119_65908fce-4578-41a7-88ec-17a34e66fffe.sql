-- Add project_id to addresses table
ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_addresses_project_id ON public.addresses(project_id);