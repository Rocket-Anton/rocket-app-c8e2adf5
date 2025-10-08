-- Add INSERT policy for profiles table to allow users to create their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add unique constraint to prevent duplicate profiles
ALTER TABLE profiles ADD CONSTRAINT profiles_id_unique UNIQUE (id);