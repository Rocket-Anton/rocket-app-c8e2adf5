-- Add coordinates column to projects table for geocoding
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS coordinates jsonb DEFAULT NULL;

-- Add index for coordinates for faster map queries
CREATE INDEX IF NOT EXISTS idx_projects_coordinates ON public.projects USING gin(coordinates);