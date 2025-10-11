-- Add chunked import support to project_address_lists
ALTER TABLE public.project_address_lists
ADD COLUMN last_processed_index INTEGER DEFAULT 0,
ADD COLUMN chunk_size INTEGER DEFAULT 100;