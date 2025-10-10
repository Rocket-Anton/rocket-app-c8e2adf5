-- RLS Policy: Super-Admins können alle Profile sehen
CREATE POLICY "Super admins can view all profiles"
ON profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin')
);

-- RLS Policy: Super-Admins können alle user_roles sehen
CREATE POLICY "Super admins can view all user roles"
ON user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin')
);