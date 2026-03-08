-- Trigger: When a new shooting is created, notify all members
CREATE TRIGGER on_shooting_created
AFTER INSERT ON public.shootings
FOR EACH ROW
EXECUTE FUNCTION public.on_shooting_created();

-- Trigger: When a payment is created, notify the member
CREATE TRIGGER on_payment_created
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_created();

-- Trigger: When attendance is recorded, notify the member
CREATE TRIGGER on_attendance_created
AFTER INSERT ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.on_attendance_created();

-- Trigger: When a notice is created, notify all members
CREATE TRIGGER on_notice_created
AFTER INSERT ON public.notices
FOR EACH ROW
EXECUTE FUNCTION public.on_notice_created();

-- Trigger: When a notice comment is created, notify others
CREATE TRIGGER on_notice_comment_created
AFTER INSERT ON public.notice_comments
FOR EACH ROW
EXECUTE FUNCTION public.on_notice_comment_created();

-- Trigger: When script permission is given, notify the member
CREATE TRIGGER on_script_permission_created
AFTER INSERT ON public.script_permissions
FOR EACH ROW
EXECUTE FUNCTION public.on_script_permission_created();