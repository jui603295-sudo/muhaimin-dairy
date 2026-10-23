# মুহাইমিন ডেইরি — প্রকল্প ও সেটিংস নীতিমালা

**ডকুমেন্টের ধরন:** উন্নয়ন নীতিমালা ও গ্রহণযোগ্যতার মানদণ্ড  
**অবস্থা:** প্রস্তাবিত/পর্যালোচনাধীন; এই ডকুমেন্ট যোগ হওয়া মানে কোনো ফিচার বাস্তবায়িত বা Production-এ সক্রিয় হয়েছে—এমন নয়।

## ১. মূল অঙ্গীকার

1. বিদ্যমান কোড, ব্যবসায়িক ডেটা, হিসাব, রিপোর্ট ও ব্যবহারকারীর কাজ সংরক্ষণ করতে হবে। wholesale rebuild বা নতুন ZIP দিয়ে চলমান প্রকল্প প্রতিস্থাপন করা যাবে না।
2. একই পরীক্ষা অকারণে বারবার করা যাবে না। প্রতিটি পরীক্ষার তারিখ, পরিবেশ, ইনপুট, ফলাফল ও প্রমাণ নথিভুক্ত করতে হবে; আগের প্রমাণ এখনও প্রযোজ্য হলে সেটি পুনর্ব্যবহার করতে হবে।
3. অনুমানকে পরীক্ষার ফলাফল হিসেবে দেখানো যাবে না। Syntax/CI সফল হওয়া ব্রাউজার, Supabase, RLS, JWT, offline sync বা বাস্তব ব্যবহারকারীর পরীক্ষা সফল হওয়ার প্রমাণ নয়।
4. কোনো SQL পরিবর্তন, ডেটা সংশোধন/মুছে ফেলা, Production migration, PR merge বা deployment-এর আগে প্রয়োজনীয় পরীক্ষা এবং স্পষ্ট অনুমোদন লাগবে।
5. AI ঐচ্ছিক; AI বন্ধ বা অনুপলব্ধ হলেও মূল ব্যবসায়িক কাজ চলতে হবে।
6. সামাজিক সেবা ও জাতীয় উন্নয়নবিষয়ক স্লোগান কনফিগারযোগ্য হবে।

## ২. উন্নয়ন, পরীক্ষা ও রিলিজের বাধ্যতামূলক ধাপ

**বর্তমান অবস্থা যাচাই → পরিকল্পনা ও ব্যাকআপ যাচাই → Development branch-এ পরিবর্তন → TEST-এ schema/RLS/JWT পরীক্ষা → build ও static validation → browser/mobile integration test → ত্রুটি সংশোধন → প্রাসঙ্গিক পরীক্ষা পুনরায় চালানো → ফলাফল নথিভুক্ত → ব্যবহারকারীর স্পষ্ট অনুমোদন → তবেই merge/deploy।**

- Production Supabase-এ পরীক্ষা করার জন্য অনিরাপদ বা পরীক্ষামূলক SQL চালানো যাবে না।
- TEST ও Production project reference স্পষ্টভাবে আলাদা করে যাচাই করতে হবে; কখনো একটির credentials/URL অন্যটির সঙ্গে গুলিয়ে ফেলা যাবে না।
- TEST-এ কেবল নকল/পরীক্ষামূলক ডেটা দিয়ে destructive test চালাতে হবে।
- migration-এর আগে বর্তমান schema, policy, dependencies, backup ও rollback পরিকল্পনা পর্যালোচনা করতে হবে।
- কোনো check ব্যর্থ হলে release থামবে; ব্যর্থতা উপেক্ষা করে merge/deploy করা যাবে না।
- প্রতিটি পরিবর্তনের জন্য কী বদলেছে, কী বদলায়নি, কোন পরীক্ষা চালানো হয়েছে, কী ফল হয়েছে এবং কী বাকি—তা জানাতে হবে।

## ৩. মডিউলভিত্তিক স্থাপত্য

প্রতিটি মডিউল নিজস্ব দায়িত্ব, settings, validation, permissions, tests, version/revision history ও audit trail পাবে। ভবিষ্যতে পৃথক app/server-এ স্থানান্তরের উপযোগী interface/contract রাখতে হবে।

- Authentication, central authorization, navigation, shared design, backup ও audit-এর মতো সাধারণ সুবিধা কেন্দ্রীয়ভাবে পরিচালিত হবে।
- মডিউল-নির্দিষ্ট নিয়ম এক মডিউলের মধ্যে সীমাবদ্ধ থাকবে; অন্য মডিউলের অভ্যন্তরীণ বাস্তবায়নের ওপর অপ্রয়োজনীয় নির্ভরতা রাখা যাবে না।
- মডিউল স্থানান্তরের সময় API/data contract, foreign key, ownership, permissions, history, audit এবং reconciliation পরীক্ষা বাধ্যতামূলক।
- একটি মডিউলের ব্যর্থতা অন্য মডিউলের গুরুত্বপূর্ণ কাজ বন্ধ না করে—যেখানে বাস্তবসম্মত, সেখানে failure isolation ও graceful fallback রাখতে হবে।
- Settings UI-তে কোনো বিকল্প দেখা গেলেই সেটি backend-এ কার্যকর হয়েছে বলে গণ্য হবে না; UI, persistence ও enforcement আলাদাভাবে যাচাই করতে হবে।

## ৪. কেন্দ্রীয় Settings ও অনুমতি

Main Admin-এর কেন্দ্রীয় Settings হবে নিরাপত্তা ও নীতির নিয়ন্ত্রণস্থল; প্রতিটি মডিউলের নিজস্ব Settings থাকবে। কোনো মডিউল কেন্দ্রীয় অনুমতি অগ্রাহ্য করতে পারবে না।

- প্রাথমিক privileged role: `main_admin`; ভবিষ্যৎ role: Manager ও Staff।
- অনুমতি অন্তত View, Create, Edit, Delete, Approve অনুযায়ী আলাদা হবে; প্রয়োজনমতো branch/center এবং নির্দিষ্ট ডেটার scope-ও লাগবে।
- UI-তে বোতাম লুকানো authorization নয়। প্রতিটি read/write/approve/delete অপারেশনে server/API/database স্তরে অনুমতি কার্যকর করতে হবে।
- role lookup ব্যর্থ হলে sensitive business data-এর access fail-closed হবে।
- role পরিবর্তন, permission grant/revoke ও সংবেদনশীল সেটিংস পরিবর্তন audit-এ লিখতে হবে।
- role table-এ নিজের role পড়তে পারার নীতি অন্য ব্যবসায়িক টেবিলে সীমাহীন access-এর অনুমতি হিসেবে ব্যবহার করা যাবে না।

## ৫. Settings-এর পরিকল্পিত বিভাগ

### 5.1 General Settings
অ্যাপ/ব্যবসার নাম, লোগো, থিম, primary color, ভাষা, তারিখের বিন্যাস, Asia/Dhaka timezone, স্লোগান, মেনু ও dashboard কাস্টমাইজেশন।

### 5.2 User & Access Control
ব্যবহারকারী, role, module permission, branch/center scope, session/security, re-authentication এবং access audit।

### 5.3 Module Settings
প্রতিটি মডিউলের enable/disable, নিজস্ব নিয়ম, validation, permission, notification/report preferences, version history, tests ও future migration contract।

### 5.4 Milk Collection Center
স্বতন্ত্র উপমডিউল:
- Milk Collection
- Chiller Management
- Loss/Damage Management
- Center Operations ও Reports

প্রতিটি উপমডিউলের permission আলাদা হবে। দুধ সংগ্রহের অনুমতি থাকলেই ক্ষয়ক্ষতি অনুমোদন বা আর্থিক হিসাব চূড়ান্ত করার অনুমতি দেওয়া যাবে না।

### 5.5 Branches & Farmers
শাখার অবস্থা Active / Payment Hold / Machine Hold / Closed; কৃষকের পরিচিতি, মোবাইল, সরাসরি Call, branch সম্পর্ক ও বাংলাদেশের ঠিকানা-ক্রম: দেশ, বিভাগ, জেলা, উপজেলা/থানা, ইউনিয়ন/পৌরসভা, গ্রাম/মহল্লা। ঠিকানা শুধু form-এ নয়—schema, validation, save, reload ও report-এও যাচাই করতে হবে।

### 5.6 Payments & Finance
কৃষক পেমেন্ট, hub payment, পাওনা, rate, commission, reconciliation, approval এবং audit। অনুমোদন ছাড়া কোনো আর্থিক রেকর্ড স্বয়ংক্রিয়ভাবে পরিবর্তন/চূড়ান্ত করা যাবে না।

### 5.7 Feed, Veterinary & Agro
পণ্য/সরবরাহকারী, stock, purchase/sales, expiry, alerts, payment এবং inventory reconciliation।

### 5.8 Notifications
ব্যবহারকারী/role/মডিউল অনুযায়ী alerts; বন্ধ করা feature-এর সক্রিয় alert দেখানো যাবে না। Notification preference সংরক্ষিত হওয়া আর notification সত্যিই পাঠানো—দুটি আলাদা acceptance test।

### 5.9 Reports & Farmer Ledger
তারিখ DD-MM-YYYY, বাংলাদেশ সময়, সঠিক totals/filters, PDF/print/share এবং হিসাবের উৎস-রেকর্ডের সঙ্গে মিল।

### 5.10 Offline & Sync
Offline queue, IndexedDB/cache, retry, duplicate prevention/idempotency, conflict handling ও sync status। প্রকৃত JWT/RLS, retry, duplicate ও conflict test প্রমাণিত না হওয়া পর্যন্ত offline sync production-এ চালু করা যাবে না। Offline cache পুরোনো/বাতিল permission-কে পাশ কাটাতে পারবে না; cache-এর scope, expiry ও revocation আচরণ পরীক্ষা করতে হবে।

### 5.11 Backup & Restore
Backup-এর সময়, format, scope ও validation; restore-এর আগে preview, compatibility check, relationship/integrity checks এবং rollback। শুধু backup তৈরি হওয়া restore-যোগ্যতার প্রমাণ নয়; আলাদা restore test দরকার।

### 5.12 Audit Log & Version History
কে, কখন, কোন record/setting পরিবর্তন করেছে; আগে/পরে মান যেখানে উপযুক্ত; approval/rejection, migration ও access-control change-এর audit। Audit history সাধারণ ব্যবহারকারীর দ্বারা নীরবে পরিবর্তন/মুছে ফেলা যাবে না।

### 5.13 Data Management
Import/export, validation, duplicate detection, data quality report ও retention policy। সম্ভাব্য duplicate স্বয়ংক্রিয়ভাবে delete করা যাবে না; আগে সম্পর্ক, ইতিহাস ও ব্যবসায়িক প্রমাণ যাচাই এবং অনুমোদন লাগবে।

### 5.14 Integration & API
API contract, external service status, rate limits ও failure handling। Service-role key, secret বা private credential browser/front-end code-এ রাখা যাবে না।

### 5.15 System Health & Maintenance
Schema/version status, backup status, test health, sync queue, errors, capacity ও maintenance notice। status কেবল প্রকৃত পর্যবেক্ষণ/পরীক্ষার ভিত্তিতে দেখাতে হবে।

### 5.16 Help & About
অ্যাপের সংস্করণ, module version, ব্যবহারবিধি, support/contact এবং policy/last update।

### 5.17 Multi-Business & Tenant Management
ভবিষ্যতে প্রতিটি business/tenant-এর data, users, storage ও settings আলাদা রাখা; cross-tenant leakage পরীক্ষা। Tenant architecture প্রয়োগ না হওয়া পর্যন্ত এ বিভাগকে implemented বলা যাবে না।

### 5.18 Workflow & Approval Designer
অনুমোদনের ধাপ, approver, escalation ও emergency workflow কনফিগারেশন; প্রতিটি সিদ্ধান্ত audit করতে হবে। Workflow UI থাকলেই enforcement সম্পন্ন নয়।

### 5.19 Data Portability & Migration
Import/export, server/provider migration, schema compatibility, reconciliation ও history/relationship preservation; vendor lock-in কমানো।

### 5.20 Sandbox & Test Environment
আলাদা TEST project, fake data, test users, schema/RLS/permission/migration tests। Production release-এর আগে critical test failure release block করবে।

### 5.21 Scheduled Jobs & Task Manager
Scheduled reports, backup/data checks, retry, execution logs, idempotency ও failure alert। job-এর ফলাফল ও ব্যর্থতা দৃশ্যমান হতে হবে।

### 5.22 Extension & Plugin Manager
Extension-এর permission, version compatibility, validation ও audit; অসামঞ্জস্যপূর্ণ extension নিরাপদে disable করার ব্যবস্থা।

### 5.23 Subscription & Resource Limits
ভবিষ্যৎ customer/tenant, storage, AI ও external service budget, usage limits এবং threshold alerts।

### 5.24 Compliance & Data Retention
প্রযোজ্য আইন/চুক্তি অনুযায়ী retention, privacy, consent, authorized export/correction/deletion। আর্থিক/audit history সংরক্ষণের নিয়ম অগ্রাহ্য করে delete করা যাবে না।

### 5.25 AI Governance & Model Lifecycle
AI versioning, evaluation, staged rollout, feedback, uncertainty, privacy, usage/cost monitoring, rollback ও emergency disable। AI কোনোভাবেই নিজে থেকে payment approve, financial record পরিবর্তন, data delete বা loss/damage finalize করতে পারবে না; sensitive action-এ human approval লাগবে। AI unavailable হলে manual/core workflow চলবে।

### 5.26 Infrastructure & Capacity Planning
ভবিষ্যৎ user/data scale, database/server capacity, service separation, resilience/failover, cost ও performance planning। ধারণা বা UI নয়, পরিমাপ ও পরীক্ষার ভিত্তিতে capacity সিদ্ধান্ত নিতে হবে।

## ৬. Milk Collection Center-এর ডেটা ও reconciliation নীতি

- Collection, batch, branch/center, farmer, date/time, quality, chiller transfer, dispatch/acceptance ও reconciliation-এর identifiers/relationships স্থায়ী ও যাচাইযোগ্য হবে।
- সম্ভাব্য quality fields: collection ID, batch ID, branch/farmer, date/time, liters, CLR, temperature, fat, SNF, lab result, tester ও status—প্রয়োজন অনুযায়ী schema ও workflow যাচাই করে।
- Collected, chilled, dispatched ও accepted quantity তুলনা করতে হবে। পার্থক্য দেখলেই সেটিকে loss হিসেবে চূড়ান্ত করা যাবে না; তদন্ত, কারণ, প্রমাণ ও অনুমোদন লাগবে।
- Loss/Damage record-এর create/edit/approve permission পৃথক হবে।
- QR/label, weighing machine/flow meter এবং hardware integration আলাদাভাবে TEST করতে হবে।
- Offline queue চালুর আগে duplicate prevention, idempotency, retry, conflict ও permission revocation পরীক্ষা বাধ্যতামূলক।

## ৭. Supabase, RLS ও authentication নীতি

- RLS enabled থাকা একা যথেষ্ট নয়; policy predicates, grants, table ownership, views, functions ও বাস্তব JWT behavior-ও পরীক্ষা করতে হবে।
- `USING (true)` বা `WITH CHECK (true)`-সহ broad authenticated policy থাকলে সেটিকে risk হিসেবে পর্যালোচনা করতে হবে; তবে schema/auth model না বুঝে blind replacement করা যাবে না।
- SQL Editor-এ owner/postgres ফলাফল সাধারণ authenticated user-এর access প্রমাণ করে না।
- Main Admin ও সীমিত-অনুমতির TEST user দিয়ে SELECT/INSERT/UPDATE/DELETE/approval, cross-branch access, role lookup failure ও unauthorized access পরীক্ষা করতে হবে।
- `force_rls=false` একা bug-এর প্রমাণ নয়; table owner/bypass behavior এবং deployment model বুঝে সিদ্ধান্ত নিতে হবে।
- Existing policy drop/replace, RLS disable, Data API enable বা schema migration করার আগে dependency review, TEST proof ও rollback plan চাই।
- কোনো TEST ফলাফলকে Production ফলাফল বলা যাবে না।

## ৮. Data integrity ও business safety

- Branch, farmer, milk collection, payments, feed/veterinary/agro records-এর foreign keys ও business relationships অক্ষত রাখতে হবে।
- Linked record থাকা অবস্থায় branch/farmer বা historical record delete করা যাবে না; সম্ভব হলে Closed/Inactive status ব্যবহার করতে হবে।
- সম্ভাব্য duplicate name/code বা trailing spaces আগে report/preview করতে হবে; স্বয়ংক্রিয় delete/merge নয়।
- Payment, commission, stock, milk quantity বা ledger-এর পরিবর্তন reconciliation ও audit ছাড়া করা যাবে না।
- Existing data-এর ওপর migration-এর আগে row counts, null/duplicate checks, relationship checks এবং backup/restore plan নথিভুক্ত করতে হবে।

## ৯. Release acceptance checklist

প্রতিটি release-এ কেবল প্রাসঙ্গিক item-গুলো একবার পরীক্ষা করে evidence link/summary সংরক্ষণ করতে হবে:
- [ ] Changed files, branch, commit SHA ও diff পর্যালোচনা
- [ ] JavaScript/syntax/build checks
- [ ] Schema/migration dry-run এবং rollback review
- [ ] RLS/policy/grants ও real JWT access tests
- [ ] Main Admin ও restricted role tests
- [ ] Branch/farmer/collection/payment relationship tests
- [ ] Date/time, address persistence, reports/ledger validation
- [ ] Offline queue/idempotency/conflict tests—যদি পরিবর্তন সংশ্লিষ্ট হয়
- [ ] Browser/mobile integration test
- [ ] Backup/restore verification—যদি data/schema পরিবর্তন হয়
- [ ] Test evidence, known issues ও rollback plan নথিভুক্ত
- [ ] ব্যবহারকারীর স্পষ্ট অনুমোদনের আগে Production merge/deploy নয়

প্রতিটি checklist item-এর status হবে **Pass / Fail / Blocked / Not applicable / Not yet tested**। “Not yet tested” কখনো “Pass” হিসেবে দেখানো যাবে না।

## ১০. বাস্তবায়নের অগ্রাধিকার

1. Security, role/permissions, audit, backup/restore ও TEST workflow।
2. Milk Collection Center, business rules, reconciliation ও data quality।
3. Offline reliability, hardware, migration ও integrations।
4. AI governance, extensions/plugins, multi-business/tenant ও scaling।

পরিকল্পিত Settings বিভাগ আগে নথিভুক্ত করা যেতে পারে; কিন্তু বাস্তবায়ন, enforcement ও production activation আলাদা ধাপ। প্রতিটি feature-এর বাস্তব অবস্থা প্রমাণ দিয়ে দেখাতে হবে।

## ১১. বর্তমান যাচাইয়ের নোট

২০২৬-১০-২৩ তারিখে প্রাপ্ত TEST schema/RLS output অনুযায়ী ২০টি public table-এ RLS enabled ছিল এবং সবগুলোর `force_rls=false` ছিল। আগের policy output-এ একাধিক table-এ broad authenticated ALL policies দেখা গিয়েছিল। এই তথ্য **প্রাথমিক ঝুঁকি-সংকেত**, JWT access test-এর বিকল্প নয়। TEST-এ branch/farmer schema-তে পূর্ণ বাংলাদেশি ঠিকানা-কলামও তখন দেখা যায়নি। এগুলোর কোনোটি এই নথি যোগ করার মাধ্যমে সংশোধিত হয়নি।

এই ডকুমেন্ট নিজে কোনো database policy, schema, application feature বা Production setting পরিবর্তন করে না।

## ১২. পরীক্ষামূলক ডেটা বনাম বাস্তব ডেটা — বাধ্যতামূলক নীতি

1. Development ও TEST পরিবেশে নকল/কাল্পনিক রেকর্ড ব্যবহার করা হলে, পরীক্ষার সুবিধার্থে সেগুলো মুছে ফেলা, reset করা, পুনরায় তৈরি করা বা বদলানো যেতে পারে। ব্যবহারকারী স্পষ্ট করেছেন যে পরীক্ষামূলক রেকর্ড হারানো নিজে কোনো বাধা নয়।
2. এই অনুমতি **মূল কোড, বিদ্যমান ফিচার, schema, project structure, configuration, credentials, backup বা অন্য প্রকল্পের কাজ নির্বিচারে মুছে ফেলা/প্রতিস্থাপনের অনুমতি নয়**। কোডের পরিবর্তন আলাদা diff, পরীক্ষা ও review-এর অধীন থাকবে।
3. Production-এ থাকা বাস্তব ব্যবসায়িক তথ্য, ব্যবহারকারীর তথ্য, আর্থিক/পেমেন্ট রেকর্ড বা live settings পরীক্ষামূলক ডেটা বলে ধরে নেওয়া যাবে না। সেগুলো পরিবর্তন বা মুছে ফেলতে আলাদা, স্পষ্ট অনুমতি এবং উপযুক্ত backup/rollback পরিকল্পনা লাগবে।
4. চূড়ান্ত acceptance test-এ ডেটা তৈরি → save → page/app পুনরায় খোলা → reload-এর পর যাচাই → edit → সংশ্লিষ্ট হিসাব/report-এ মিল → backup/restore যাচাই করতে হবে, যেখানে প্রযোজ্য। পরীক্ষার উদ্দেশ্যে reset করা হলে সেটি test environment-এ সীমাবদ্ধ রাখতে হবে।
5. এই নীতি আগের “ডেটা সংরক্ষণ” নিয়মের সঙ্গে মিলিয়ে পড়তে হবে: পরীক্ষামূলক ডেটা রক্ষা করার জন্য উন্নয়ন আটকে রাখা বাধ্যতামূলক নয়; কিন্তু বাস্তব Production ডেটা সুরক্ষা এবং মূল কোডের অখণ্ডতা অপরিবর্তনীয় শর্ত।
6. নথি আপডেট করা মানে এই নীতি Production-এ প্রযুক্তিগতভাবে enforce হয়েছে—এমন নয়। এটি প্রকল্পের workflow ও review-এর বাধ্যতামূলক নির্দেশনা; বাস্তব enforcement আলাদাভাবে পরীক্ষা করতে হবে।

