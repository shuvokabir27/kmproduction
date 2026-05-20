ALTER TABLE public.voice_note_clips 
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT 'pending';