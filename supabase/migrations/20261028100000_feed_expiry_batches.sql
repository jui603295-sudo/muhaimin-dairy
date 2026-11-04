-- Feed expiry tracking is stored per purchase lot. Existing rows remain valid with NULL expiry.
-- Apply only in the isolated TEST Supabase project first; do not run on Production before release gates pass.
ALTER TABLE public.feed_purchases
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS feed_purchases_expiry_date_idx
  ON public.feed_purchases (expiry_date)
  WHERE expiry_date IS NOT NULL;

COMMENT ON COLUMN public.feed_purchases.batch_number IS
  'Supplier/manufacturer batch identifier for feed purchase lot.';
COMMENT ON COLUMN public.feed_purchases.expiry_date IS
  'Expiry date of this purchased feed lot; NULL means not recorded.';
