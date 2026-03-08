
ALTER TABLE public.conversation_members ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();
