-- Create table for project-rocket assignments
CREATE TABLE public.project_rockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_rockets ENABLE ROW LEVEL SECURITY;

-- Admins can manage project-rocket assignments
CREATE POLICY "Admins can manage project rockets"
ON public.project_rockets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own project assignments
CREATE POLICY "Users can view their project assignments"
ON public.project_rockets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update projects RLS to allow rockets and project managers to view their projects
CREATE POLICY "Rockets can view assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_rockets
    WHERE project_rockets.project_id = projects.id
    AND project_rockets.user_id = auth.uid()
  )
  OR auth.uid() = project_manager_id
);