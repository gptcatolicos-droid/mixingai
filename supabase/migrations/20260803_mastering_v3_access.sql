-- MixingMusic V3: secure mastering usage and saved configurations.
-- Apply before enabling the V3 frontend access API.

CREATE TABLE IF NOT EXISTS public.mastering_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'unlimited')),
  source text NOT NULL DEFAULT 'migration',
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastering_free_downloads (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastering_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  preset_id text NOT NULL CHECK (preset_id IN (
    'pop', 'rock', 'hiphop', 'reggaeton', 'dance', 'clasica', 'balada', 'acustico', 'gospel'
  )),
  strength smallint NOT NULL CHECK (strength BETWEEN 0 AND 100),
  stereo smallint NOT NULL CHECK (stereo BETWEEN 0 AND 60),
  loudness text NOT NULL CHECK (loudness IN ('streaming', 'balanced', 'competitive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mastering_orders (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paypal' CHECK (provider IN ('paypal')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed')),
  capture_id text UNIQUE,
  provider_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mastering_configurations_user_created_idx
  ON public.mastering_configurations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mastering_orders_user_created_idx
  ON public.mastering_orders(user_id, created_at DESC);

ALTER TABLE public.mastering_free_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastering_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastering_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastering_orders ENABLE ROW LEVEL SECURITY;

-- Preserve access for accounts already marked Unlimited in the existing
-- server-managed users table. Future payments must upsert this table.
INSERT INTO public.mastering_entitlements (user_id, tier, source)
SELECT id, 'unlimited', 'v3_backfill'
FROM public.users
WHERE COALESCE(is_pro, false) = true OR plan = 'unlimited'
ON CONFLICT (user_id) DO UPDATE SET
  tier = 'unlimited',
  source = 'v3_backfill',
  updated_at = now();

-- Configurations can be read by their owner. Mutations are performed by the
-- authenticated Edge Function after validating the user's paid entitlement.
DROP POLICY IF EXISTS "Users read own mastering configurations" ON public.mastering_configurations;
CREATE POLICY "Users read own mastering configurations"
  ON public.mastering_configurations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_mastering_configuration_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mastering_configuration_updated_at ON public.mastering_configurations;
CREATE TRIGGER mastering_configuration_updated_at
  BEFORE UPDATE ON public.mastering_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_mastering_configuration_updated_at();

REVOKE ALL ON public.mastering_free_downloads FROM anon, authenticated;
REVOKE ALL ON public.mastering_entitlements FROM anon, authenticated;
REVOKE ALL ON public.mastering_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mastering_configurations FROM anon, authenticated;
GRANT SELECT ON public.mastering_configurations TO authenticated;
