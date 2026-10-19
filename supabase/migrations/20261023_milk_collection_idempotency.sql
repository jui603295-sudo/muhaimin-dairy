-- Milk Collection V3: idempotency foundation for a future offline sync queue.
-- TEST project only. This migration does not itself enable offline sync.
-- Apply only after restoring the verified backup into the separate TEST project.

begin;

alter table public.milk_collections
  add column if not exists client_record_id uuid;

-- Existing rows may keep NULL. New offline-capable clients will generate one UUID
-- per collection attempt and reuse that UUID for every retry.
create unique index if not exists milk_collections_client_record_id_uidx
  on public.milk_collections(client_record_id)
  where client_record_id is not null;

comment on column public.milk_collections.client_record_id is
  'Client-generated idempotency UUID for safe retry/sync. NULL on legacy records; must be generated once and reused by future offline-sync clients.';

commit;

-- TEST acceptance criteria before implementing queue replay:
-- 1. Two rows with different client_record_id values can be inserted.
-- 2. Re-inserting the same client_record_id is rejected by the unique index.
-- 3. Existing records with NULL client_record_id remain valid.
-- 4. Replay must query by client_record_id before retrying and reconcile duplicate-key
--    responses as "already synced"; it must never blindly create a second row.
-- 5. Do not enable client-side queue replay until real-JWT RLS tests pass.
