-- Muhaimin Dairy: dairy product manufacturing workspace.
-- TEST-ONLY migration. Do not apply to Production until the TEST project is ACTIVE,
-- migrations are applied there, JWT/RLS tests pass, and explicit release approval is given.
-- This schema is separate from milk collection/farmer payments; it does not alter those tables.

BEGIN;

DO $precheck$
BEGIN
  IF to_regclass('public.app_user_roles') IS NULL THEN
    RAISE EXCEPTION 'Missing public.app_user_roles; apply the TEST security baseline first.';
  END IF;
  IF to_regprocedure('public.has_app_role(text)') IS NULL THEN
    RAISE EXCEPTION 'Missing public.has_app_role(text); apply the TEST security baseline first.';
  END IF;
END;
$precheck$;

CREATE TABLE IF NOT EXISTS public.dairy_processing_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 140),
  institution_type text NOT NULL DEFAULT 'production_factory',
  contact_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  daily_milk_demand_l numeric(12,2) NOT NULL DEFAULT 0 CHECK (daily_milk_demand_l >= 0),
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(product_ids) = 'array'),
  contract_terms text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dairy_processing_institutions_active_name_phone_uq
  ON public.dairy_processing_institutions (lower(btrim(name)), btrim(phone))
  WHERE is_active AND nullif(btrim(phone), '') IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.dairy_processing_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL UNIQUE CHECK (length(btrim(product_code)) BETWEEN 1 AND 60),
  name text NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  unit text NOT NULL DEFAULT 'কেজি' CHECK (unit IN ('কেজি','লিটার','প্যাকেট','পিস')),
  ingredients text NOT NULL DEFAULT '',
  process_notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.dairy_processing_products(product_code,name,unit,ingredients)
VALUES
 ('cheese','চিজ','কেজি','দুধ, কালচার/রেনেট'),
 ('yogurt','দই','কেজি','দুধ, কালচার'),
 ('ghee','ঘি','কেজি','মাখন/ক্রিম'),
 ('butter','মাখন','কেজি','ক্রিম'),
 ('paneer','পনির/ছানা','কেজি','দুধ, খাদ্য-গ্রেড কোয়াগুল্যান্ট'),
 ('cream','ক্রিম','কেজি','দুধ'),
 ('icecream','আইসক্রিম','লিটার','দুধ/ক্রিম ও অনুমোদিত উপকরণ'),
 ('other','অন্যান্য দুগ্ধজাত পণ্য','কেজি','সেটিংস অনুযায়ী')
ON CONFLICT (product_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dairy_processing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL UNIQUE CHECK (length(btrim(batch_code)) BETWEEN 1 AND 80),
  institution_id uuid NOT NULL REFERENCES public.dairy_processing_institutions(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.dairy_processing_products(id) ON DELETE RESTRICT,
  production_date date NOT NULL,
  milk_liters numeric(12,3) NOT NULL CHECK (milk_liters > 0),
  ingredients_note text NOT NULL DEFAULT '',
  output_qty numeric(12,3) NOT NULL CHECK (output_qty > 0),
  quality_status text NOT NULL DEFAULT 'pending'
    CHECK (quality_status IN ('pending','hold','rejected','accepted')),
  quality_notes text NOT NULL DEFAULT '',
  quality_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quality_approved_at timestamptz,
  expiry_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expiry_date >= production_date),
  CHECK (
    (quality_status = 'accepted' AND quality_approved_by IS NOT NULL AND quality_approved_at IS NOT NULL)
    OR quality_status <> 'accepted'
  )
);

CREATE TABLE IF NOT EXISTS public.dairy_processing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.dairy_processing_batches(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  transaction_kind text NOT NULL CHECK (transaction_kind IN ('sale','return','waste')),
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  buyer_or_reference text NOT NULL DEFAULT '',
  return_quality_status text NOT NULL DEFAULT 'not_applicable'
    CHECK (return_quality_status IN ('not_applicable','pending','accepted','rejected')),
  restock_approved boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (transaction_kind = 'return' AND return_quality_status <> 'not_applicable')
    OR (transaction_kind <> 'return' AND return_quality_status = 'not_applicable' AND restock_approved = false)
  ),
  CHECK (NOT restock_approved OR (transaction_kind = 'return' AND return_quality_status = 'accepted'))
);

CREATE TABLE IF NOT EXISTS public.dairy_processing_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_date date NOT NULL,
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 100),
  institution_id uuid REFERENCES public.dairy_processing_institutions(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.dairy_processing_batches(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dairy_processing_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_table text NOT NULL,
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  before_row jsonb,
  after_row jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Every table is isolated behind Main Admin-only RLS. The frontend must still fail closed.
DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dairy_processing_institutions','dairy_processing_products',
    'dairy_processing_batches','dairy_processing_transactions',
    'dairy_processing_costs','dairy_processing_audit'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS dairy_processing_main_admin_only ON public.%I',t);
    EXECUTE format(
      'CREATE POLICY dairy_processing_main_admin_only ON public.%I FOR ALL TO authenticated USING (public.has_app_role(''main_admin'')) WITH CHECK (public.has_app_role(''main_admin''))',
      t
    );
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',t);
  END LOOP;
END;
$rls$;

-- Audit is append-only for application users; only the trigger owner writes audit rows.
REVOKE INSERT, UPDATE, DELETE ON public.dairy_processing_audit FROM authenticated;
GRANT SELECT ON public.dairy_processing_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_dairy_processing_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  b public.dairy_processing_batches%ROWTYPE;
  v_sold numeric(14,3);
  v_wasted numeric(14,3);
  v_restocked numeric(14,3);
  v_returned numeric(14,3);
  v_available numeric(14,3);
BEGIN
  -- Serialize all stock mutations for a batch; concurrent sales cannot oversell it.
  SELECT * INTO b
  FROM public.dairy_processing_batches
  WHERE id = NEW.batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production batch not found' USING ERRCODE = '23503';
  END IF;

  IF NEW.transaction_kind = 'sale' THEN
    IF b.quality_status <> 'accepted' OR b.quality_approved_by IS NULL THEN
      RAISE EXCEPTION 'Batch quality approval is required before sale' USING ERRCODE = '23514';
    END IF;
    IF b.expiry_date < NEW.transaction_date OR b.expiry_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Expired batch cannot be sold' USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT
    COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'sale'),0),
    COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'waste'),0),
    COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'return' AND restock_approved),0),
    COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'return'),0)
  INTO v_sold,v_wasted,v_restocked,v_returned
  FROM public.dairy_processing_transactions
  WHERE batch_id = NEW.batch_id AND id <> NEW.id;

  IF NEW.transaction_kind = 'sale' THEN
    v_available := b.output_qty - v_sold - v_wasted + v_restocked;
    IF NEW.quantity > v_available THEN
      RAISE EXCEPTION 'Sale quantity exceeds available stock' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.transaction_kind = 'waste' THEN
    v_available := b.output_qty - v_sold - v_wasted + v_restocked;
    IF NEW.quantity > v_available THEN
      RAISE EXCEPTION 'Waste quantity exceeds available stock' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.transaction_kind = 'return' THEN
    IF NEW.quantity > v_sold - v_returned THEN
      RAISE EXCEPTION 'Return quantity exceeds sold quantity not previously returned' USING ERRCODE = '23514';
    END IF;
    IF NEW.restock_approved AND (NEW.return_quality_status <> 'accepted' OR b.expiry_date < CURRENT_DATE) THEN
      RAISE EXCEPTION 'Return must pass quality review and be unexpired before restocking' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dairy_processing_transaction_guard ON public.dairy_processing_transactions;
CREATE TRIGGER dairy_processing_transaction_guard
BEFORE INSERT OR UPDATE ON public.dairy_processing_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_dairy_processing_transaction();

CREATE OR REPLACE FUNCTION public.validate_dairy_processing_batch_output()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_sold numeric(14,3);
  v_wasted numeric(14,3);
  v_restocked numeric(14,3);
BEGIN
  IF NEW.output_qty IS DISTINCT FROM OLD.output_qty THEN
    SELECT
      COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'sale'),0),
      COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'waste'),0),
      COALESCE(sum(quantity) FILTER (WHERE transaction_kind = 'return' AND restock_approved),0)
    INTO v_sold,v_wasted,v_restocked
    FROM public.dairy_processing_transactions
    WHERE batch_id = OLD.id;
    IF NEW.output_qty < v_sold + v_wasted - v_restocked THEN
      RAISE EXCEPTION 'Output quantity cannot be less than net stock already removed' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dairy_processing_batch_output_guard ON public.dairy_processing_batches;
CREATE TRIGGER dairy_processing_batch_output_guard
BEFORE UPDATE OF output_qty ON public.dairy_processing_batches
FOR EACH ROW EXECUTE FUNCTION public.validate_dairy_processing_batch_output();

REVOKE ALL ON FUNCTION public.validate_dairy_processing_batch_output() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_dairy_processing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_before := NULL; v_after := to_jsonb(NEW); v_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD); v_after := to_jsonb(NEW); v_id := NEW.id;
  ELSE
    v_before := to_jsonb(OLD); v_after := NULL; v_id := OLD.id;
  END IF;
  INSERT INTO public.dairy_processing_audit(entity_table,entity_id,action,before_row,after_row,changed_by)
  VALUES (TG_TABLE_NAME,v_id,lower(TG_OP),v_before,v_after,auth.uid());
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DO $audit_triggers$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dairy_processing_institutions','dairy_processing_products',
    'dairy_processing_batches','dairy_processing_transactions','dairy_processing_costs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS dairy_processing_audit_row ON public.%I',t);
    EXECUTE format(
      'CREATE TRIGGER dairy_processing_audit_row AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_dairy_processing_change()',
      t
    );
  END LOOP;
END;
$audit_triggers$;

REVOKE ALL ON FUNCTION public.validate_dairy_processing_transaction() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_dairy_processing_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.dairy_processing_stock
WITH (security_invoker = true)
AS
SELECT
  b.id AS batch_id,
  b.batch_code,
  b.institution_id,
  b.product_id,
  b.production_date,
  b.expiry_date,
  b.quality_status,
  b.output_qty,
  COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'sale'),0) AS sold_qty,
  COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'waste'),0) AS waste_qty,
  COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'return' AND t.restock_approved),0) AS restocked_return_qty,
  b.output_qty
    - COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'sale'),0)
    - COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'waste'),0)
    + COALESCE(sum(t.quantity) FILTER (WHERE t.transaction_kind = 'return' AND t.restock_approved),0) AS available_qty
FROM public.dairy_processing_batches b
LEFT JOIN public.dairy_processing_transactions t ON t.batch_id = b.id
GROUP BY b.id;

GRANT SELECT ON public.dairy_processing_stock TO authenticated;

CREATE INDEX IF NOT EXISTS dairy_processing_batches_date_idx
  ON public.dairy_processing_batches(production_date DESC);
CREATE INDEX IF NOT EXISTS dairy_processing_batches_expiry_idx
  ON public.dairy_processing_batches(expiry_date);
CREATE INDEX IF NOT EXISTS dairy_processing_transactions_batch_date_idx
  ON public.dairy_processing_transactions(batch_id,transaction_date DESC);
CREATE INDEX IF NOT EXISTS dairy_processing_costs_date_idx
  ON public.dairy_processing_costs(cost_date DESC);

COMMIT;

-- TEST acceptance only:
-- * Confirm all six tables have RLS enabled AND forced.
-- * Confirm anon cannot select/write; non-main-admin JWT cannot select/write.
-- * Confirm Main Admin JWT can CRUD; audit rows are created automatically.
-- * Race two sales that together exceed stock: one must fail.
-- * A sale from pending/hold/rejected/expired batch must fail.
-- * A return cannot exceed sold quantity; it affects stock only after explicit accepted quality review.
-- * Do not apply to Production before TEST evidence and explicit approval.
