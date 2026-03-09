CREATE POLICY "Users can soft delete own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (sender_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));