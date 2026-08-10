ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'es'
  CHECK (preferred_locale IN ('es', 'en', 'fr', 'zh'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'es'
  CHECK (preferred_locale IN ('es', 'en', 'fr', 'zh'));
