-- Add status column to projects table
ALTER TABLE public.projects 
ADD COLUMN status TEXT NOT NULL DEFAULT 'In Planung' 
CHECK (status IN ('In Planung', 'Läuft', 'Abgeschlossen'));

-- Add index for better query performance on status
CREATE INDEX idx_projects_status ON public.projects(status);