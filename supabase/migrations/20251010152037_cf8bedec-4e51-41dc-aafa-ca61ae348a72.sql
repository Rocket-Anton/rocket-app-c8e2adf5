-- Remove duplicate admin role for user (keep only super_admin)
DELETE FROM user_roles 
WHERE user_id = '6ce3c9bd-5288-497e-b854-bfd04574979e' 
  AND role = 'admin';

-- Add UNIQUE constraint to ensure one role per user
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_user_id_unique 
  UNIQUE (user_id);