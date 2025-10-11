-- Add import_payload and last_progress_at to project_address_lists for reliable resume
ALTER TABLE public.project_address_lists
ADD COLUMN IF NOT EXISTS import_payload jsonb,
ADD COLUMN IF NOT EXISTS last_progress_at timestamp with time zone DEFAULT now();

-- Create index for monitoring stuck imports
CREATE INDEX IF NOT EXISTS idx_project_address_lists_last_progress_at 
ON public.project_address_lists(last_progress_at) 
WHERE status = 'importing';

COMMENT ON COLUMN public.project_address_lists.import_payload IS 'Stores CSV data, column mapping, and metadata needed to resume imports';
COMMENT ON COLUMN public.project_address_lists.last_progress_at IS 'Timestamp of last progress update for stuck detection';