-- Add new columns to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS abbreviation TEXT;