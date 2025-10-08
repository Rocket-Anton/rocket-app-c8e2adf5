-- Create table for project address lists
CREATE TABLE public.project_address_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  column_mapping JSONB,
  upload_stats JSONB,
  error_details JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_address_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage project address lists"
ON public.project_address_lists
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view project address lists"
ON public.project_address_lists
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_project_address_lists_updated_at
BEFORE UPDATE ON public.project_address_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add list_id column to addresses table to track which list imported them
ALTER TABLE public.addresses
ADD COLUMN list_id UUID REFERENCES public.project_address_lists(id) ON DELETE SET NULL;