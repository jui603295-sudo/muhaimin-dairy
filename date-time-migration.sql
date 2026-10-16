-- Safe date/time support migration for Muhaimin Dairy.
-- Run once in Supabase SQL Editor before relying on manually entered transaction times.
-- Existing rows are preserved; new time columns are nullable.

ALTER TABLE public.milk_collections ADD COLUMN IF NOT EXISTS collection_time time without time zone;
ALTER TABLE public.farmer_payments ADD COLUMN IF NOT EXISTS payment_time time without time zone;

ALTER TABLE public.feed_purchases ADD COLUMN IF NOT EXISTS purchase_time time without time zone;
ALTER TABLE public.feed_sales ADD COLUMN IF NOT EXISTS sale_time time without time zone;

ALTER TABLE public.vet_purchases ADD COLUMN IF NOT EXISTS purchase_time time without time zone;
ALTER TABLE public.vet_sales ADD COLUMN IF NOT EXISTS sale_time time without time zone;

ALTER TABLE public.agro_purchases ADD COLUMN IF NOT EXISTS purchase_time time without time zone;
ALTER TABLE public.agro_sales ADD COLUMN IF NOT EXISTS sale_time time without time zone;
