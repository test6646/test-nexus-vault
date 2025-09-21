-- Fix storage RLS policies for accounting-documents bucket

-- First ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('accounting-documents', 'accounting-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create RLS policies for the accounting-documents bucket
CREATE POLICY "Users can upload documents to their firm folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'accounting-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT id::text FROM firms WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can view documents from their firm" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'accounting-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT id::text FROM firms WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can update documents in their firm folder" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'accounting-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT id::text FROM firms WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete documents from their firm folder" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'accounting-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text FROM profiles WHERE user_id = auth.uid()
    UNION
    SELECT id::text FROM firms WHERE created_by = auth.uid()
  )
);