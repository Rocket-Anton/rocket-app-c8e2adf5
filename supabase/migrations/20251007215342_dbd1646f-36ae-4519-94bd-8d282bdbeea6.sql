-- Create storage bucket for provider logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-logos', 'provider-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for provider logos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-logos');

CREATE POLICY "Authenticated users can upload provider logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own provider logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'provider-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own provider logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'provider-logos' 
  AND auth.role() = 'authenticated'
);