-- Fix RLS recursion in chat tables using SECURITY DEFINER helpers
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = _conversation_id
      AND cm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_creator(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = _conversation_id
      AND c.created_by = _user_id
  );
$$;

-- Remove recursive policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view members of own conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Conversation creator or admin can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON public.messages;

-- Recreate non-recursive policies
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_conversation_member(id, auth.uid())
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view members of own conversations"
  ON public.conversation_members FOR SELECT
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Conversation creator or admin can add members"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_conversation_creator(conversation_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can send messages to own conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id, auth.uid())
  );