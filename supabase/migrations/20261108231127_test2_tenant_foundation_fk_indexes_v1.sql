-- TEST 2 only: cover tenant foundation foreign keys with indexes.
begin;
create index if not exists tenants_created_by_idx
  on private.tenants(created_by) where created_by is not null;
create index if not exists tenant_memberships_invited_by_idx
  on private.tenant_memberships(invited_by) where invited_by is not null;
create index if not exists tenant_invitations_created_by_idx
  on private.tenant_invitations(created_by);
commit;
