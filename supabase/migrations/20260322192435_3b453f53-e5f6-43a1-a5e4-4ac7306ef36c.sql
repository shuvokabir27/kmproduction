
-- Call types enum
CREATE TYPE public.call_type AS ENUM ('audio', 'video');
CREATE TYPE public.call_status AS ENUM ('ringing', 'active', 'ended', 'missed', 'declined');

-- Calls table for history and state
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  call_type public.call_type NOT NULL DEFAULT 'audio',
  status public.call_status NOT NULL DEFAULT 'ringing',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own calls"
  ON public.calls FOR SELECT
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Authenticated users can create calls"
  ON public.calls FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Call participants can update calls"
  ON public.calls FOR UPDATE
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Enable realtime for calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
