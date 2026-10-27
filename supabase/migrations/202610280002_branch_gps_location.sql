-- TEST-first migration for optional collection branch GPS metadata.
-- Apply only to the isolated TEST project after reviewing the migration.
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy_m double precision,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_latitude_range_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_latitude_range_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_longitude_range_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_longitude_range_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_location_pair_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_location_pair_check CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL));
  END IF;
END $$;
