-- Create helper functions for role hierarchy
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT has_role(auth.uid(), 'super_admin'::app_role)
$function$;

CREATE OR REPLACE FUNCTION public.is_regular_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT has_role(auth.uid(), 'admin'::app_role) 
  AND NOT has_role(auth.uid(), 'super_admin'::app_role)
$function$;

CREATE OR REPLACE FUNCTION public.target_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT has_role(_user_id, 'super_admin'::app_role)
$function$;

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

CREATE POLICY "Super Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins can manage non-super-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.is_regular_admin() 
  AND NOT public.target_is_super_admin(user_id)
)
WITH CHECK (
  public.is_regular_admin()
  AND role != 'super_admin'
);

-- Update profiles policies
CREATE POLICY "Super Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Admins can update non-super-admin profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_regular_admin()
  AND NOT public.target_is_super_admin(id)
);

CREATE POLICY "Super Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_regular_admin());