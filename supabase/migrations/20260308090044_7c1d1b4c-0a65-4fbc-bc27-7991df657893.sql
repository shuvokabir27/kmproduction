-- Add cover_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to member-photos
CREATE POLICY "Authenticated users can upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-photos');

-- Allow authenticated users to update member photos
CREATE POLICY "Authenticated users can update member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'member-photos');

-- Allow authenticated users to delete member photos
CREATE POLICY "Authenticated users can delete member photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'member-photos');

-- Allow public to view member photos
CREATE POLICY "Anyone can view member photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'member-photos');