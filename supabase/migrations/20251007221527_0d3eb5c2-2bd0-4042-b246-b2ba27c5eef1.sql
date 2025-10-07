-- Add is_active column to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;