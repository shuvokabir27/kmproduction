
-- Conversation type enum
CREATE TYPE public.conversation_type AS ENUM ('personal', 'group');

-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  type public.conversation_type NOT NULL DEFAULT 'personal',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation members
CREATE TABLE public.conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view conversations they are members of
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS: Authenticated users can create conversations
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: Admin or creator can update conversations
CREATE POLICY "Creator or admin can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS: Admin or creator can delete conversations
CREATE POLICY "Creator or admin can delete conversations"
  ON public.conversations FOR DELETE
  USING (
    created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Conversation Members RLS
CREATE POLICY "Users can view members of own conversations"
  ON public.conversation_members FOR SELECT
  USING (
    conversation_id IN (SELECT conversation_id FROM public.conversation_members cm WHERE cm.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Conversation creator or admin can add members"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (SELECT id FROM public.conversations WHERE created_by = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
  );

CREATE POLICY "Admin can delete members"
  ON public.conversation_members FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Messages RLS
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can send messages to own conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;

-- Index for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX idx_conversation_members_conversation_id ON public.conversation_members(conversation_id);
