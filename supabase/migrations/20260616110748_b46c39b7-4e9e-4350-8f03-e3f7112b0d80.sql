UPDATE auth.users 
SET encrypted_password = crypt('01747729757@Sk', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'shuvokuakata27@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT '947ef58f-2d52-4d2e-8c21-e28efdf9e364', 'product_admin'::app_role
ON CONFLICT (user_id, role) DO NOTHING;