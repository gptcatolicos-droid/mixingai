-- Canonical paid capability: public.mastering_entitlements.tier = 'unlimited'.
-- The legacy tables remain mirrored during the transition because existing UI
-- surfaces still read them, but no payment flow may update only one store.

DO $$
DECLARE payment_provider_constraint text;
BEGIN
  SELECT conname INTO payment_provider_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.payment_history'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%provider%';

  IF payment_provider_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payment_history DROP CONSTRAINT %I', payment_provider_constraint);
  END IF;
END $$;

ALTER TABLE public.payment_history
  ADD CONSTRAINT payment_history_provider_check
  CHECK (provider IN ('paypal', 'stripe', 'shopify', 'mercadopago'));

CREATE UNIQUE INDEX IF NOT EXISTS payment_history_provider_transaction_uidx
  ON public.payment_history(provider, transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Backfill every previously entitled account. Profiles are the current V3
-- source; users is retained for legacy purchases.
INSERT INTO public.mastering_entitlements (user_id, tier, source, granted_at, updated_at)
SELECT eligible.id, 'unlimited', 'legacy_backfill', now(), now()
FROM (
  SELECT id FROM public.users WHERE COALESCE(is_pro, false) OR plan IN ('pro', 'unlimited')
  UNION
  SELECT id FROM public.profiles WHERE COALESCE(is_pro, false) OR plan IN ('pro', 'unlimited')
) AS eligible
ON CONFLICT (user_id) DO UPDATE
SET tier = 'unlimited', updated_at = now();

-- Keep legacy views of the account coherent with the canonical entitlement.
UPDATE public.users u
SET is_pro = true,
    plan = 'unlimited',
    subscription_status = 'active',
    updated_at = now()
FROM public.mastering_entitlements e
WHERE e.user_id = u.id AND e.tier = 'unlimited';

UPDATE public.profiles p
SET is_pro = true,
    plan = 'unlimited',
    updated_at = now()
FROM public.mastering_entitlements e
WHERE e.user_id = p.id AND e.tier = 'unlimited';

-- This RPC was used by the legacy Mercado Pago webhook. Keep it internally
-- coherent while that endpoint is retired; the new webhook writes the
-- entitlement directly and does not depend on this function.
CREATE OR REPLACE FUNCTION public.activate_pro(p_user_id uuid, p_provider text, p_subscription_id text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mastering_entitlements (user_id, tier, source, granted_at, updated_at)
  VALUES (p_user_id, 'unlimited', p_provider, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET tier = 'unlimited', source = EXCLUDED.source, updated_at = now();

  UPDATE public.users SET
    plan = 'unlimited',
    is_pro = true,
    subscription_status = 'active',
    subscription_id = p_subscription_id,
    subscription_provider = p_provider,
    subscription_start = CURRENT_DATE
  WHERE id = p_user_id;

  UPDATE public.profiles SET plan = 'unlimited', is_pro = true, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_pro(uuid, text, text) FROM PUBLIC, anon, authenticated;
