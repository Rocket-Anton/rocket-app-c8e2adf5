-- Update RLS policies for providers table to allow users to manage their own providers

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can update providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;

-- Create new policies that allow users to manage their own providers
CREATE POLICY "Users can view their own providers"
ON public.providers
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own providers"
ON public.providers
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own providers"
ON public.providers
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own providers"
ON public.providers
FOR DELETE
USING (auth.uid() = created_by);