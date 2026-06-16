
-- === KM SHOP ONLY: Drop all team/production tables and functions ===

-- Drop triggers first (they reference functions we'll drop)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all team-related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.notify_member(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.notify_all_members(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.on_shooting_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_notice_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_notice_comment_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_attendance_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_payment_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_task_assigned() CASCADE;
DROP FUNCTION IF EXISTS public.on_task_completed() CASCADE;
DROP FUNCTION IF EXISTS public.on_advance_request_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_advance_request_reviewed() CASCADE;
DROP FUNCTION IF EXISTS public.on_salary_change_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_script_permission_created() CASCADE;
DROP FUNCTION IF EXISTS public.grant_member_achievements(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.grant_all_member_achievements() CASCADE;
DROP FUNCTION IF EXISTS public.send_birthday_notifications() CASCADE;
DROP FUNCTION IF EXISTS public.detect_advance_payment() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_advance_request_limits() CASCADE;
DROP FUNCTION IF EXISTS public.auto_deduct_advance_on_attendance() CASCADE;
DROP FUNCTION IF EXISTS public.sync_artist_name_on_profile_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_freelance_projects_client_name() CASCADE;
DROP FUNCTION IF EXISTS public.member_owns_client_artist_row(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.member_can_access_freelance_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.member_can_access_freelance_project(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_profiles_safe() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_profile_by_member_id(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_public_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.get_approved_profile_comments(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_shared_freelance_project(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_shared_freelance_scenes(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_shared_freelance_assignments(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_creator(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_receipts() CASCADE;
DROP FUNCTION IF EXISTS public.deactivate_old_app_versions() CASCADE;

-- Drop all team/production tables (CASCADE removes FKs, policies, triggers)
DROP TABLE IF EXISTS public.actor_credits CASCADE;
DROP TABLE IF EXISTS public.actor_portfolio_images CASCADE;
DROP TABLE IF EXISTS public.advance_deductions CASCADE;
DROP TABLE IF EXISTS public.advance_requests CASCADE;
DROP TABLE IF EXISTS public.app_versions CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.birthday_wishes CASCADE;
DROP TABLE IF EXISTS public.bonuses CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.client_artists CASCADE;
DROP TABLE IF EXISTS public.client_payment_history CASCADE;
DROP TABLE IF EXISTS public.client_profiles CASCADE;
DROP TABLE IF EXISTS public.client_project_artists CASCADE;
DROP TABLE IF EXISTS public.client_project_expenses CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.favorite_works CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.freelance_assignments CASCADE;
DROP TABLE IF EXISTS public.freelance_payments CASCADE;
DROP TABLE IF EXISTS public.freelance_projects CASCADE;
DROP TABLE IF EXISTS public.freelance_scenes CASCADE;
DROP TABLE IF EXISTS public.gallery_images CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.marquee_settings CASCADE;
DROP TABLE IF EXISTS public.member_achievements CASCADE;
DROP TABLE IF EXISTS public.member_permissions CASCADE;
DROP TABLE IF EXISTS public.member_tasks CASCADE;
DROP TABLE IF EXISTS public.memes CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.news_categories CASCADE;
DROP TABLE IF EXISTS public.news_publishers CASCADE;
DROP TABLE IF EXISTS public.news_ticker CASCADE;
DROP TABLE IF EXISTS public.notice_comments CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.password_reset_otps CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.poll_options CASCADE;
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.polls CASCADE;
DROP TABLE IF EXISTS public.popular_videos CASCADE;
DROP TABLE IF EXISTS public.profile_comments CASCADE;
DROP TABLE IF EXISTS public.profile_ratings CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.salary_changes CASCADE;
DROP TABLE IF EXISTS public.salary_credits CASCADE;
DROP TABLE IF EXISTS public.script_comments CASCADE;
DROP TABLE IF EXISTS public.script_permissions CASCADE;
DROP TABLE IF EXISTS public.scripts CASCADE;
DROP TABLE IF EXISTS public.service_offers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.shooting_expenses CASCADE;
DROP TABLE IF EXISTS public.shooting_participants CASCADE;
DROP TABLE IF EXISTS public.shooting_scenes CASCADE;
DROP TABLE IF EXISTS public.shootings CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;
DROP TABLE IF EXISTS public.vapid_keys CASCADE;
DROP TABLE IF EXISTS public.voice_note_clips CASCADE;
DROP TABLE IF EXISTS public.voice_notes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop and recreate user_roles with only product_admin role
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.salary_type CASCADE;

CREATE TYPE public.app_role AS ENUM ('product_admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- has_role function (still needed for shop admin checks)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
