-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Paiements (CinetPay + Stripe)
-- ═══════════════════════════════════════════════════════════════════════════
-- Étend asvc_invoices pour stocker l'URL de paiement générée + la transaction
-- externe. Helpers RPC pour marquer paid (idempotent + audit).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.asvc_invoices
  ADD COLUMN IF NOT EXISTS payment_provider          TEXT,           -- 'cinetpay' | 'stripe'
  ADD COLUMN IF NOT EXISTS payment_url               TEXT,           -- URL checkout fournie au client
  ADD COLUMN IF NOT EXISTS external_transaction_id   TEXT,           -- CinetPay transaction_id ou Stripe session_id
  ADD COLUMN IF NOT EXISTS payment_initiated_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_asvc_invoices_external_tx
  ON public.asvc_invoices(external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_set_invoice_payment_link — appelé par le connecteur CinetPay/Stripe
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_set_invoice_payment_link(
  p_invoice_id              UUID,
  p_provider                TEXT,
  p_payment_url             TEXT,
  p_external_transaction_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.asvc_invoices
     SET payment_provider = p_provider,
         payment_url = p_payment_url,
         external_transaction_id = p_external_transaction_id,
         payment_initiated_at = now(),
         status = CASE
           WHEN status IN ('draft','pending_approval') THEN 'sent'
           ELSE status
         END,
         updated_at = now()
   WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_set_invoice_payment_link(UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_set_invoice_payment_link(UUID,TEXT,TEXT,TEXT) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_mark_invoice_paid — appelé par le webhook (idempotent)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_mark_invoice_paid(
  p_invoice_id          UUID,
  p_external_tx_id      TEXT,
  p_amount_paid_fcfa    BIGINT,
  p_currency            TEXT,
  p_payment_method      TEXT,
  p_paid_date           DATE DEFAULT CURRENT_DATE,
  p_payload             JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.asvc_invoices%ROWTYPE;
  v_already_paid BOOLEAN;
BEGIN
  SELECT * INTO v_inv FROM public.asvc_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % introuvable', p_invoice_id;
  END IF;

  v_already_paid := (v_inv.status = 'paid');

  -- Si déjà payée avec la MÊME transaction, idempotent (retourne info, pas update)
  IF v_already_paid AND v_inv.external_transaction_id = p_external_tx_id THEN
    RETURN jsonb_build_object('already_paid', true, 'changed', false);
  END IF;

  -- Vérification montant (tolérance 0)
  IF p_amount_paid_fcfa < v_inv.amount_ttc_fcfa THEN
    UPDATE public.asvc_invoices
       SET status = 'partially_paid',
           paid_date = p_paid_date,
           payment_method = p_payment_method,
           payment_reference = p_external_tx_id,
           external_transaction_id = p_external_tx_id,
           updated_at = now()
     WHERE id = p_invoice_id;

    INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
    VALUES ('external','payment_webhook','invoice_partially_paid','asvc_invoices', p_invoice_id,
            jsonb_build_object(
              'amount_paid_fcfa', p_amount_paid_fcfa,
              'amount_due_fcfa', v_inv.amount_ttc_fcfa,
              'tx', p_external_tx_id,
              'currency', p_currency,
              'payload', p_payload
            ));
    RETURN jsonb_build_object('status', 'partially_paid', 'changed', true);
  END IF;

  -- Paiement complet
  UPDATE public.asvc_invoices
     SET status = 'paid',
         paid_date = p_paid_date,
         payment_method = p_payment_method,
         payment_reference = p_external_tx_id,
         external_transaction_id = p_external_tx_id,
         updated_at = now()
   WHERE id = p_invoice_id;

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('external','payment_webhook','invoice_paid','asvc_invoices', p_invoice_id,
          jsonb_build_object(
            'amount_paid_fcfa', p_amount_paid_fcfa,
            'tx', p_external_tx_id,
            'currency', p_currency,
            'payload', p_payload
          ));

  RETURN jsonb_build_object('status', 'paid', 'changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_mark_invoice_paid(UUID,TEXT,BIGINT,TEXT,TEXT,DATE,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_mark_invoice_paid(UUID,TEXT,BIGINT,TEXT,TEXT,DATE,JSONB) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_find_invoice_by_tx — résout invoice depuis le transaction_id webhook
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_find_invoice_by_tx(p_tx TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.asvc_invoices
   WHERE external_transaction_id = p_tx
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.asvc_find_invoice_by_tx(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_find_invoice_by_tx(TEXT) TO service_role;
