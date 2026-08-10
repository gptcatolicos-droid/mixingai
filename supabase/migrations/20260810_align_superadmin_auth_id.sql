-- Daniel's original public.users row predates Auth integration. Preserve it
-- for audit history and create a correctly keyed companion row for Auth.
-- Do not rewrite primary keys: historical child records may reference them.
UPDATE public.users legacy
SET email = concat('archived+', legacy.id::text, '@legacy.invalid'),
    updated_at = now()
FROM auth.users auth_user
WHERE lower(legacy.email) = lower(auth_user.email)
  AND lower(auth_user.email) = lower('danipalacio@gmail.com')
  AND legacy.id <> auth_user.id
  AND NOT EXISTS (SELECT 1 FROM public.users current_user WHERE current_user.id = auth_user.id);

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
