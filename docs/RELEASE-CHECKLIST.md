# Muhaimin Dairy release checklist

Release status remains **NOT READY** until every required check has recorded evidence.

- [x] Static source guard for explicit TEST selection and Production URL/key rejection added.
- [x] Cheese Home local-only contact notebook added with escaped rendering and per-user browser storage.
- [ ] GitHub Actions pass on the exact final PR head.
- [ ] Separate TEST Supabase project is accessible and healthy.
- [ ] TEST JWT/RLS checks prove allowed and denied operations for Main Admin and non-admin accounts.
- [ ] TEST CRUD, duplicate prevention, audit history, and data integrity checks pass.
- [ ] Real Android phone interaction tests cover all Milk Center navigation tiles and Cheese Home.
- [ ] Regression checks confirm existing farmer, collection, payment, feed, veterinary, agro, report, ledger, backup, and audit modules remain functional.
- [ ] Backup/restore has been restore-tested away from Production.

Cheese Home contact notes currently stay in this browser/device only; they do not sync to Supabase or other devices and are not server-backed business records. Offline queue replay remains disabled until its safety checks are proven.

Do not merge to a release branch or deploy until the pending evidence is documented and reviewed. Do not apply migrations to Production as part of TEST work.
