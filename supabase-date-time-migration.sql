-- মুহাইমিন ডেইরি: idempotent transaction-time columns
-- This file changes schema only; it does not insert, update, or delete business records.
BEGIN;

ALTER TABLE public.milk_collections
  ADD COLUMN IF NOT EXISTS collection_time time without time zone;

ALTER TABLE public.farmer_payments
  ADD COLUMN IF NOT EXISTS payment_time time without time zone;

ALTER TABLE public.feed_purchases
  ADD COLUMN IF NOT EXISTS purchase_time time without time zone;

ALTER TABLE public.feed_sales
  ADD COLUMN IF NOT EXISTS sale_time time without time zone;

ALTER TABLE public.vet_purchases
  ADD COLUMN IF NOT EXISTS purchase_time time without time zone;

ALTER TABLE public.vet_sales
  ADD COLUMN IF NOT EXISTS sale_time time without time zone;

ALTER TABLE public.agro_purchases
  ADD COLUMN IF NOT EXISTS purchase_time time without time zone;

ALTER TABLE public.agro_sales
  ADD COLUMN IF NOT EXISTS sale_time time without time zone;

COMMIT;

-- Refresh PostgREST's schema cache after the columns are confirmed/added.
NOTIFY pgrst, 'reload schema';
