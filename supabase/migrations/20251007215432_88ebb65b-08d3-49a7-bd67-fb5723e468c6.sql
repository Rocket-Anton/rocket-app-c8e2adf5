-- Create storage bucket for provider logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-logos', 'provider-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for provider logos with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Provider Logos Public Access'
  ) THEN
    CREATE POLICY "Provider Logos Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'provider-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Provider Logos Authenticated Upload'
  ) THEN
    CREATE POLICY "Provider Logos Authenticated Upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'provider-logos' 
      AND auth.role() = 'authenticated'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Provider Logos Authenticated Update'
  ) THEN
    CREATE POLICY "Provider Logos Authenticated Update"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'provider-logos' 
      AND auth.role() = 'authenticated'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Provider Logos Authenticated Delete'
  ) THEN
    CREATE POLICY "Provider Logos Authenticated Delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'provider-logos' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;