-- Add projects_with_bonus field to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS projects_with_bonus boolean DEFAULT true;

-- Update NetCom BW provider to not have bonus projects
UPDATE public.providers 
SET projects_with_bonus = false 
WHERE name ILIKE '%NetCom%BW%' OR abbreviation ILIKE '%NetCom%BW%';