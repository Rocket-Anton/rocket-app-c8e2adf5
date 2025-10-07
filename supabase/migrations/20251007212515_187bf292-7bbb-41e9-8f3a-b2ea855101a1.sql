-- Create providers table
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS on providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- RLS policies for providers (only admins can manage)
CREATE POLICY "Admins can view all providers"
ON public.providers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert providers"
ON public.providers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update providers"
ON public.providers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete providers"
ON public.providers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add provider_id to projects table
ALTER TABLE public.projects
ADD COLUMN provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_providers_created_by ON public.providers(created_by);
CREATE INDEX idx_projects_provider_id ON public.projects(provider_id);

-- Add trigger to providers table for updated_at
CREATE TRIGGER update_providers_updated_at
BEFORE UPDATE ON public.providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();