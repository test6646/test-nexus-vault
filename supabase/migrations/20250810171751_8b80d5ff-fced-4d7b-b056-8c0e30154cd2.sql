-- Create RLS policies for firm-logos storage bucket

-- Allow users to upload logos to their firm's folder
CREATE POLICY "Users can upload firm logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'firm-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE created_by = auth.uid()
  )
);

-- Allow users to update/replace logos in their firm's folder
CREATE POLICY "Users can update firm logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'firm-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'firm-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE created_by = auth.uid()
  )
);

-- Allow users to delete logos from their firm's folder
CREATE POLICY "Users can delete firm logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'firm-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.firms WHERE created_by = auth.uid()
  )
);

-- Allow public access to view logos (since bucket is public)
CREATE POLICY "Public can view firm logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'firm-logos');