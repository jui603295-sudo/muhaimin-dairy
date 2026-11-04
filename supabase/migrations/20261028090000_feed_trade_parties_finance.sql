-- Feed trade counterparty, photo, location and settlement fields.
-- Apply in TEST first; do not run against Production without explicit approval.
begin;
alter table public.feed_purchases
  add column if not exists supplier_phone text,
  add column if not exists supplier_photo_data text,
  add column if not exists supplier_latitude double precision,
  add column if not exists supplier_longitude double precision,
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.feed_sales
  add column if not exists customer_phone text,
  add column if not exists customer_photo_data text,
  add column if not exists customer_latitude double precision,
  add column if not exists customer_longitude double precision,
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.feed_purchases
  drop constraint if exists feed_purchases_payment_method_check,
  add constraint feed_purchases_payment_method_check
    check (payment_method in ('cash','credit','partial')),
  drop constraint if exists feed_purchases_location_check,
  add constraint feed_purchases_location_check
    check ((supplier_latitude is null or supplier_latitude between -90 and 90)
       and (supplier_longitude is null or supplier_longitude between -180 and 180)),
  drop constraint if exists feed_purchases_due_amount_check,
  add constraint feed_purchases_due_amount_check check (due_amount >= 0);
alter table public.feed_sales
  drop constraint if exists feed_sales_payment_method_check,
  add constraint feed_sales_payment_method_check
    check (payment_method in ('cash','credit','partial')),
  drop constraint if exists feed_sales_location_check,
  add constraint feed_sales_location_check
    check ((customer_latitude is null or customer_latitude between -90 and 90)
       and (customer_longitude is null or customer_longitude between -180 and 180)),
  drop constraint if exists feed_sales_due_amount_check,
  add constraint feed_sales_due_amount_check check (due_amount >= 0);
commit;
