-- Create addon_groups table
CREATE TABLE public.addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(name, provider_id)
);

-- Add addon_group_id to addons table
ALTER TABLE public.addons
ADD COLUMN addon_group_id UUID REFERENCES public.addon_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_groups
CREATE POLICY "Admins can manage addon groups"
ON public.addon_groups
FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can view addon groups"
ON public.addon_groups
FOR SELECT
USING (is_admin_or_super());