-- Repair for production records created before public.users was keyed to Auth.
INSERT INTO public.users (
  id, email, first_name, last_name, username, country, credits, provider,
  created_at, updated_at, email_verified, plan, is_pro, subscription_status
)
SELECT auth_user.id, auth_user.email, profile.first_name, profile.last_name,
  profile.username, profile.country, COALESCE(profile.credits, 999999),
  COALESCE(profile.provider, 'email'), COALESCE(profile.created_at, now()),
  now(), auth_user.email_confirmed_at IS NOT NULL, 'unlimited', true, 'active'
FROM auth.users auth_user
LEFT JOIN public.profiles profile ON profile.id = auth_user.id
WHERE lower(auth_user.email) = lower('danipalacio@gmail.com')
ON CONFLICT (id) DO UPDATE SET
  plan = 'unlimited', is_pro = true, subscription_status = 'active',
  updated_at = now();
