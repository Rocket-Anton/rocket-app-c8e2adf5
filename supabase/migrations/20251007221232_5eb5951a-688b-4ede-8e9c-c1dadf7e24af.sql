-- Revert providers policies back to admin-only and add current user as admin

-- Drop user-based policies
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;

-- Recreate admin-only policies using the existing has_role function
CREATE POLICY "Admins can view all providers"
ON public.providers
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert providers"
ON public.providers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update providers"
ON public.providers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete providers"
ON public.providers
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Also apply admin policies to projects table
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projects"
ON public.projects
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projects"
ON public.projects
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add the current user (Jakob) as admin
-- User ID: 6ce3c9bd-5288-497e-b854-bfd04574979e
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ce3c9bd-5288-497e-b854-bfd04574979e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;