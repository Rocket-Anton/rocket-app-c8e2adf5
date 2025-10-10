-- Extend app_role enum with new roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'rocket';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'project_manager';

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-avatars bucket
CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  is_admin_or_super()
);

CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-avatars' AND is_admin_or_super());

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-avatars' AND is_admin_or_super());