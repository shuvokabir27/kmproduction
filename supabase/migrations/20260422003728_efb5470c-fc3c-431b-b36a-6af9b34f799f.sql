-- Create public storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Authenticated users (admins) can upload
CREATE POLICY "Authenticated can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Authenticated users can update/replace
CREATE POLICY "Authenticated can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');