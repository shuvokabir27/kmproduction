
-- Add client script fields to freelance_projects
ALTER TABLE public.freelance_projects
  ADD COLUMN IF NOT EXISTS client_script text,
  ADD COLUMN IF NOT EXISTS client_script_images jsonb DEFAULT '[]'::jsonb;

-- Allow clients to update only script fields on their own projects
CREATE POLICY "Clients can update own project scripts"
ON public.freelance_projects
FOR UPDATE
TO authenticated
USING (
  client_profile_id IN (
    SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  client_profile_id IN (
    SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for client script images
INSERT INTO storage.buckets (id, name, public) VALUES ('client-scripts', 'client-scripts', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view uploaded script images
CREATE POLICY "Public can view client script images"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-scripts');

-- Authenticated users can upload to client-scripts bucket
CREATE POLICY "Authenticated users can upload client scripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-scripts');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own client script files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-scripts' AND auth.uid()::text = (storage.foldername(name))[1]);
