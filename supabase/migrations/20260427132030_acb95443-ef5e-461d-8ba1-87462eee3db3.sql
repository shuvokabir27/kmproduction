-- Create public bucket for app downloads (APK/IPA files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-downloads',
  'app-downloads',
  true,
  524288000, -- 500 MB limit
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream', 'application/iphone']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000;

-- Public can read (download) files
CREATE POLICY "Anyone can download app files"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-downloads');

-- Only admins can upload
CREATE POLICY "Admins can upload app files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can update
CREATE POLICY "Admins can update app files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can delete
CREATE POLICY "Admins can delete app files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);