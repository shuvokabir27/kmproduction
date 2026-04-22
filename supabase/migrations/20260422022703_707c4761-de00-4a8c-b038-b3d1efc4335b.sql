CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

CREATE TABLE public.member_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_tasks ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins can manage all tasks"
ON public.member_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Members can view tasks assigned to them OR by them
CREATE POLICY "Members can view own tasks"
ON public.member_tasks FOR SELECT
USING (
  assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Members can create tasks (assign to anyone), but assigned_by must be themselves
CREATE POLICY "Members can create tasks"
ON public.member_tasks FOR INSERT
WITH CHECK (
  assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Assignee can update status; assigner can update everything
CREATE POLICY "Assignee or assigner can update tasks"
ON public.member_tasks FOR UPDATE
USING (
  assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Only assigner can delete
CREATE POLICY "Assigner can delete tasks"
ON public.member_tasks FOR DELETE
USING (
  assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE INDEX idx_tasks_assigned_to ON public.member_tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON public.member_tasks(assigned_by);
CREATE INDEX idx_tasks_status ON public.member_tasks(status);

-- Auto update timestamp
CREATE TRIGGER update_member_tasks_updated_at
BEFORE UPDATE ON public.member_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify on task assignment
CREATE OR REPLACE FUNCTION public.on_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_name TEXT;
  priority_label TEXT;
BEGIN
  SELECT full_name INTO assigner_name FROM public.profiles WHERE id = NEW.assigned_by;
  priority_label := CASE NEW.priority
    WHEN 'urgent' THEN '🔴 জরুরি'
    WHEN 'high' THEN '🟠 উচ্চ'
    WHEN 'medium' THEN '🟡 মাঝারি'
    ELSE '🟢 কম'
  END;

  PERFORM notify_member(
    NEW.assigned_to,
    'task',
    '📋 নতুন টাস্ক: ' || NEW.title,
    COALESCE(assigner_name, 'কেউ') || ' আপনাকে টাস্ক দিয়েছেন (' || priority_label || ')',
    '/tasks'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_task_assigned
AFTER INSERT ON public.member_tasks
FOR EACH ROW EXECUTE FUNCTION public.on_task_assigned();

-- Notify when task status changes to done
CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at := now();
    SELECT full_name INTO assignee_name FROM public.profiles WHERE id = NEW.assigned_to;

    -- Notify assigner if different from assignee
    IF NEW.assigned_by != NEW.assigned_to THEN
      PERFORM notify_member(
        NEW.assigned_by,
        'task',
        '✅ টাস্ক সম্পন্ন: ' || NEW.title,
        COALESCE(assignee_name, 'সদস্য') || ' টাস্কটি সম্পন্ন করেছেন',
        '/tasks'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_task_completed
BEFORE UPDATE ON public.member_tasks
FOR EACH ROW EXECUTE FUNCTION public.on_task_completed();