-- Muhaimin Dairy: isolated Milk Collection Main Admin settings
-- TEST-first migration. Apply to TEST only; do not run against LIVE without explicit approval.
-- Preserves unknown JSON keys and records a revision/audit row on every successful save.

BEGIN;

CREATE TABLE IF NOT EXISTS public.milk_collection_settings (
  setting_key text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT milk_collection_settings_object CHECK (jsonb_typeof(settings) = 'object')
);

CREATE TABLE IF NOT EXISTS public.milk_collection_settings_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  setting_key text NOT NULL,
  revision bigint NOT NULL,
  action text NOT NULL DEFAULT 'update',
  old_settings jsonb,
  new_settings jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milk_collection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collection_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collection_settings_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_collection_settings_audit FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "main admin can read milk collection settings"
  ON public.milk_collection_settings;
CREATE POLICY "main admin can read milk collection settings"
  ON public.milk_collection_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'main_admin'
    )
  );

DROP POLICY IF EXISTS "main admin can read milk collection settings audit"
  ON public.milk_collection_settings_audit;
CREATE POLICY "main admin can read milk collection settings audit"
  ON public.milk_collection_settings_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'main_admin'
    )
  );

-- No direct writes from client roles. Writes must go through the guarded RPC.
REVOKE ALL ON TABLE public.milk_collection_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.milk_collection_settings_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.milk_collection_settings TO authenticated;
GRANT SELECT ON TABLE public.milk_collection_settings_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.save_milk_collection_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_old_settings jsonb;
  v_new_settings jsonb;
  v_revision bigint;
  v_action text;
  v_default jsonb := '{
    "default_purchase_rate": 50,
    "clr_min": 0,
    "clr_max": 50,
    "quality_review_required": true,
    "quality_reason_required": true,
    "offline_queue_enabled": false,
    "barcode_scanner_enabled": true,
    "sample_photo_required": false,
    "scale_integration_enabled": false,
    "receipt_print_enabled": true,
    "receipt_share_enabled": true
  }'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = v_user_id AND r.role = 'main_admin'
  ) THEN
    RAISE EXCEPTION 'Main Admin permission required' USING ERRCODE = '42501';
  END IF;

  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  -- Serialize saves so revision numbers and audit rows remain consistent.
  PERFORM pg_advisory_xact_lock(hashtext('public.milk_collection_settings:default'));

  SELECT s.settings, s.revision
    INTO v_old_settings, v_revision
  FROM public.milk_collection_settings s
  WHERE s.setting_key = 'default'
  FOR UPDATE;

  IF NOT FOUND THEN
    v_old_settings := '{}'::jsonb;
    v_revision := 0;
    v_action := 'create';
  ELSE
    v_action := 'update';
  END IF;

  -- Merge defaults, saved values, then submitted values; unrecognized future keys survive.
  v_new_settings := v_default || COALESCE(v_old_settings, '{}'::jsonb) || p_settings;
  -- Offline queue stays disabled until JWT/RLS/idempotency/retry/conflict tests are documented.
  v_new_settings := jsonb_set(v_new_settings, '{offline_queue_enabled}', 'false'::jsonb, true);

  IF jsonb_typeof(v_new_settings->'default_purchase_rate') <> 'number'
     OR (v_new_settings->>'default_purchase_rate')::numeric < 0 THEN
    RAISE EXCEPTION 'default_purchase_rate must be a non-negative number' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_new_settings->'clr_min') <> 'number'
     OR jsonb_typeof(v_new_settings->'clr_max') <> 'number'
     OR (v_new_settings->>'clr_min')::numeric < 0
     OR (v_new_settings->>'clr_max')::numeric > 100
     OR (v_new_settings->>'clr_min')::numeric > (v_new_settings->>'clr_max')::numeric THEN
    RAISE EXCEPTION 'CLR limits are invalid' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_each(v_new_settings) e
    WHERE e.key IN (
      'quality_review_required','quality_reason_required','offline_queue_enabled',
      'barcode_scanner_enabled','sample_photo_required','scale_integration_enabled',
      'receipt_print_enabled','receipt_share_enabled'
    ) AND jsonb_typeof(e.value) <> 'boolean'
  ) THEN
    RAISE EXCEPTION 'Boolean setting has an invalid value' USING ERRCODE = '22023';
  END IF;

  v_revision := v_revision + 1;

  INSERT INTO public.milk_collection_settings
    (setting_key, settings, schema_version, revision, updated_by, created_at, updated_at)
  VALUES
    ('default', v_new_settings, 1, v_revision, v_user_id, now(), now())
  ON CONFLICT (setting_key) DO UPDATE
    SET settings = EXCLUDED.settings,
        schema_version = EXCLUDED.schema_version,
        revision = EXCLUDED.revision,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.milk_collection_settings_audit
    (setting_key, revision, action, old_settings, new_settings, changed_by)
  VALUES
    ('default', v_revision, v_action,
     CASE WHEN v_old_settings = '{}'::jsonb AND v_action = 'create' THEN NULL ELSE v_old_settings END,
     v_new_settings, v_user_id);

  RETURN jsonb_build_object(
    'settings', v_new_settings,
    'schema_version', 1,
    'revision', v_revision
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_milk_collection_settings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_milk_collection_settings(jsonb) TO authenticated;

COMMIT;
