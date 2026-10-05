-- মুহাইমিন: safe defaults + initial Feed/Veterinary companies
ALTER TABLE public.milk_collections
  ALTER COLUMN purchase_rate SET DEFAULT 50;

ALTER TABLE public.feed_products
  ALTER COLUMN purchase_price SET DEFAULT 50,
  ALTER COLUMN sale_price SET DEFAULT 50;

ALTER TABLE public.feed_purchases
  ALTER COLUMN purchase_price_per_kg SET DEFAULT 50;

ALTER TABLE public.feed_sales
  ALTER COLUMN sale_price_per_kg SET DEFAULT 50;

INSERT INTO public.feed_products (product_code, product_name, unit, purchase_price, sale_price)
SELECT v.code, v.name, 'kg', 50, 50
FROM (VALUES
  ('FD001','গোয়ালা ফিড'),
  ('FD002','নারিশ'),
  ('FD003','ACI Feed'),
  ('FD004','Provita Feed'),
  ('FD005','Fresh Feed')
) AS v(code,name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.feed_products p WHERE lower(trim(p.product_name))=lower(trim(v.name))
);

INSERT INTO public.vet_companies (company_name)
SELECT v.name
FROM (VALUES
  ('Square Pharmaceuticals PLC'),
  ('Renata PLC'),
  ('ACME Laboratories Ltd.'),
  ('SK+F Pharmaceuticals Ltd.'),
  ('ACI Animal Health'),
  ('Opsonin Pharma Ltd.'),
  ('Incepta Pharmaceuticals Ltd.')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.vet_companies c WHERE lower(trim(c.company_name))=lower(trim(v.name))
);

UPDATE public.app_settings
SET business_name='মুহাইমিন ডেইরি'
WHERE id = (SELECT id FROM public.app_settings ORDER BY created_at LIMIT 1);
