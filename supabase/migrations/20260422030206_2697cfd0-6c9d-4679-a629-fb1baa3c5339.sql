
-- Status enum
CREATE TYPE public.advance_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Advance requests table
CREATE TABLE public.advance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT,
  status public.advance_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_note TEXT,
  approved_amount NUMERIC,
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_advance_requests_member ON public.advance_requests(member_id);
CREATE INDEX idx_advance_requests_status ON public.advance_requests(status);

ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

-- Members can view their own requests
CREATE POLICY "Members can view own advance requests"
ON public.advance_requests
FOR SELECT
USING (
  member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Members can create their own requests
CREATE POLICY "Members can create own advance requests"
ON public.advance_requests
FOR INSERT
WITH CHECK (
  member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Members can cancel their own pending requests
CREATE POLICY "Members can update own pending advance requests"
ON public.advance_requests
FOR UPDATE
USING (
  member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'pending'
);

-- Admins can manage all
CREATE POLICY "Admins can manage all advance requests"
ON public.advance_requests
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto update timestamp
CREATE TRIGGER update_advance_requests_updated_at
BEFORE UPDATE ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admin when member creates request
CREATE OR REPLACE FUNCTION public.on_advance_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_name TEXT;
BEGIN
  SELECT full_name INTO member_name FROM public.profiles WHERE id = NEW.member_id;
  
  -- Notify all admins
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT ur.user_id, 'advance',
    '💰 নতুন অ্যাডভান্স রিকোয়েস্ট',
    COALESCE(member_name, 'একজন সদস্য') || ' ৳' || NEW.amount::TEXT || ' অ্যাডভান্স চেয়েছেন',
    '/admin/advances'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_advance_request_created
AFTER INSERT ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_advance_request_created();

-- Notify member when admin reviews
CREATE OR REPLACE FUNCTION public.on_advance_request_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  title_text TEXT;
  message_text TEXT;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      title_text := '✅ অ্যাডভান্স অনুমোদিত';
      message_text := '৳' || COALESCE(NEW.approved_amount, NEW.amount)::TEXT || ' অ্যাডভান্স অনুমোদিত হয়েছে';
    ELSE
      title_text := '❌ অ্যাডভান্স বাতিল';
      message_text := COALESCE(NEW.admin_note, 'আপনার অ্যাডভান্স রিকোয়েস্ট বাতিল করা হয়েছে');
    END IF;
    
    PERFORM public.notify_member(
      NEW.member_id,
      'advance',
      title_text,
      message_text,
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_advance_request_reviewed
AFTER UPDATE ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_advance_request_reviewed();
