-- Remove duplicate admin role for user (keep only super_admin)
DELETE FROM user_roles 
WHERE user_id = '6ce3c9bd-5288-497e-b854-bfd04574979e' 
  AND role = 'admin';