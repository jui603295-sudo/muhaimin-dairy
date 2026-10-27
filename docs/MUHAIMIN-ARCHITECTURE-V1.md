# মুহাইমিন ডেইরি — Modular Enterprise Architecture V1

## উদ্দেশ্য
বর্তমান অ্যাপ, ব্যবসার তথ্য ও কার্যকর ফিচার অক্ষত রেখে মডিউলগুলোকে আলাদা সীমা, সেটিংস, অনুমতি, পরীক্ষা ও ভবিষ্যৎ স্থানান্তরের উপযোগী করা। এটি একটি স্থাপত্য-চুক্তি; এতে লেখা কোনো ফিচারকে শুধু তালিকাভুক্ত থাকার কারণে বাস্তবে সম্পূর্ণ বলে গণ্য করা যাবে না।

## অপরিবর্তনীয় নীতি
1. Production ডেটা, কোড বা ব্যবহারকারীর কার্যক্রম মুছে/প্রতিস্থাপন নয়; আগে ব্যাকআপ, তুলনা ও যাচাই।
2. প্রতিটি মডিউলের স্থিতি স্পষ্ট: `current`, `planned`, `gated`, অথবা `disabled`।
3. ব্রাউজারের module registry শুধু navigation/metadata। নিরাপত্তার একমাত্র কর্তৃত্ব নয়। প্রতিটি ডেটা অপারেশনে Supabase RLS/server-side authorization বাধ্যতামূলক।
4. TEST-এ schema/migration, RLS, role matrix, data integrity, restore, mobile workflow ও regression পরীক্ষা পাস না করা পর্যন্ত Production পরিবর্তন নয়।
5. Offline replay, hardware integration এবং AI ডিফল্টে বন্ধ থাকবে; পরীক্ষিত feature flag, idempotency, conflict policy ও audit trail ছাড়া সক্রিয় নয়।
6. মডিউল এক অ্যাপে থাকতে পারে, কিন্তু পরিষ্কার API/ডেটা-চুক্তির কারণে পরে আলাদা app/server-এ নেওয়া সম্ভব হতে হবে।

## প্রস্তাবিত স্তর
- **Core:** app bootstrap, identity, role/permission contracts, settings, audit, backup/restore.
- **Milk Center workspace:** collection, payments, quality/batches, chiller log, loss, expenses/sales, settings; Cheese Home এই workspace-এর ভেতরে।
- **Business:** branches, farmers, farmer ledger, feed, veterinary, agro care, reports.
- **Future adapters:** offline sync, device/hardware adapters, AI, production expansion, supply-chain/partners.
- **Shared contracts:** IDs, timestamps (Bangladesh display timezone), validation, error format, migration versioning, audit metadata.

## Cheese Home boundary
Cheese Home remains a child workspace of Milk Center, not a top-level tile on the main dashboard. Its future production, stock, sales, receivables and costs must not be confused with third-party supplier/manufacturer data. Do not enable server sync or offline replay until the corresponding TEST schema, RLS, duplicate protection, conflict resolution and recovery tests pass.

## Release gate
- [ ] Existing production code/data baseline recorded.
- [ ] Static syntax and module-registry tests pass.
- [ ] Every module entry is reconciled with real UI and behavior; registry status updated honestly.
- [ ] Supabase migrations reviewed and applied in TEST only.
- [ ] RLS tested with real authenticated roles and unauthorized users.
- [ ] Data creation/edit/delete, duplicate prevention, Bangladesh date/time, backup/restore tested.
- [ ] Mobile navigation and Cheese Home tap-through tested on real device.
- [ ] Regression suite passes; evidence and commit SHA recorded.
- [ ] Explicit release approval recorded before merge/deploy.

## Current scope of this change
This change adds a metadata registry and its unit tests. It does **not** claim to complete the full application refactor, TEST Supabase integration, browser QA, or production release.
