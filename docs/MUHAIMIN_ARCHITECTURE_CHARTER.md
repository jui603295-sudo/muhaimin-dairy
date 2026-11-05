# মুহাইমিন প্রকল্প — স্থায়ী Architecture Charter

**নথির ধরন:** প্রকল্পব্যাপী স্থাপত্য ও উন্নয়ন নীতিমালা  
**নীতিগত অবস্থা:** ব্যবহারকারীর স্পষ্ট অনুমোদনে গৃহীত  
**অনুমোদনের তারিখ:** ২০২৬-১১-০৬  
**বাস্তবায়নের অবস্থা:** নীতিমালা অনুমোদিত; সব নীতি প্রযুক্তিগতভাবে বাস্তবায়িত বা Production-এ সক্রিয়—এমন দাবি করা হচ্ছে না।

এই Charter মুহাইমিন প্রকল্পের বর্তমান ও ভবিষ্যৎ সব Module, Service, Integration এবং প্রয়োজনে ভবিষ্যৎ Application Name/Branding পরিবর্তনের ক্ষেত্রেও প্রযোজ্য। এটি Branch Module-এ সীমাবদ্ধ নয়।

## ১. সর্বজনীন স্থাপত্যনীতি

1. সব Module একই কেন্দ্রীয় Architecture Charter অনুসরণ করবে।
2. Platform হবে modular, integrated, secure, extensible এবং AI-assisted।
3. প্রতিটি Module-এর নিজস্ব দায়িত্ব, data contract, validation, permission ও business logic থাকবে; কিন্তু shared platform services-এর সঙ্গে নির্ধারিত interface/API দিয়ে সমন্বিত হবে।
4. একই তথ্য অপ্রয়োজনীয়ভাবে একাধিক Module-এ duplicate করে রাখা যাবে না। প্রয়োজনীয় reference, event বা projection ব্যবহার করলে তার উৎস ও মালিকানা নির্ধারিত থাকবে।
5. একটি Module-এর ব্যর্থতা অন্য Module-এর গুরুত্বপূর্ণ কাজ বন্ধ করবে না—যেখানে বাস্তবসম্মত, সেখানে dependency isolation, graceful fallback এবং failure handling রাখতে হবে।
6. বিদ্যমান কার্যকর কোড, feature, schema, configuration ও বাস্তব তথ্য না বুঝে পরিবর্তন করা যাবে না।
7. কোনো Module বা Feature বন্ধ করলে তার পুরোনো তথ্য মুছে ফেলা যাবে না।
8. নতুন Feature যোগ করতে গিয়ে পুরোনো কার্যকর Feature অকারণে পুনর্নির্মাণ, প্রতিস্থাপন বা ভেঙে ফেলা যাবে না।

## ২. Dairy Operations Hub — Milk Collection-কেন্দ্রিক ব্যবসায়িক কাঠামো

Milk Collection হবে Dairy Sector-এর কেন্দ্রীয় Workspace ও operational hub। Dairy ব্যবসার সব প্রাসঙ্গিক Feature এই Workspace থেকে সমন্বিতভাবে ব্যবহারযোগ্য হবে।

তবে সব Feature একটি বিশাল Module, একটি টেবিল বা একটি Backend Function-এ একত্র করা হবে না। প্রতিটি Feature তার উপযুক্ত Module-এর দায়িত্বে থাকবে এবং নির্ধারিত API/Service ও data contract দিয়ে পরস্পরের সঙ্গে যুক্ত হবে।

প্রস্তাবিত দায়িত্ব-বণ্টন:

| Module | নিজস্ব দায়িত্ব |
|---|---|
| Branch Management | শাখা, সংগ্রহ কেন্দ্র, GPS, শাখার কর্মী ও কার্যক্রম |
| Farmer Management | কৃষকের পরিচয়, যোগাযোগ, সম্পর্ক ও প্রাসঙ্গিক তথ্য |
| Milk Collection | দুধ সংগ্রহ, পরিমাপ, সংগ্রহ রেকর্ড ও reconciliation |
| Quality & Batch | দুধের মান, পরীক্ষা, batch, quarantine ও quality history |
| Accounts & Payments | কৃষক পাওনা, পেমেন্ট, লেনদেন, ledger ও আর্থিক অনুমোদন |
| Inventory & Feed | Feed, stock, purchase, sale, expiry ও inventory হিসাব |
| Veterinary & Agro | সংশ্লিষ্ট সেবা, পণ্য, stock ও কার্যক্রম |
| Employees | কর্মী, assignment, role ও branch scope |
| Processing & Supply | দুধ প্রক্রিয়াজাতকরণ, dairy products, dispatch ও supply |
| Reports & Intelligence | সমন্বিত রিপোর্ট, analytics, forecast ও AI insights |

### ২.১ Dairy Feature Registry

প্রতিটি Dairy Feature-এর জন্য একটি কেন্দ্রীয় registry/নথিভুক্ত তালিকা রাখার নীতি থাকবে। সেখানে অন্তত নির্ধারিত হবে:

- Feature-এর নাম ও মালিক Module
- সংশ্লিষ্ট Module ও dependency
- ব্যবহৃত data entity ও authoritative source
- অনুমোদিত API/Backend Function
- প্রয়োজনীয় Role, Permission ও branch/center scope
- Enable/Disable আচরণ ও fallback
- সংশ্লিষ্ট test ও acceptance evidence

এর উদ্দেশ্য হলো একই ব্যবসায়িক Feature একাধিক Module-এ অসামঞ্জস্যপূর্ণভাবে তৈরি হওয়া ঠেকানো।

## ৩. Branch Module-এর পাঁচটি প্রধান অংশ

Branch Module-কে পাঁচটি সমন্বিত কিন্তু দায়িত্বভিত্তিক অংশে সাজানো হবে:

1. **Branch Core:** স্থায়ী Branch ID, unique code, পরিচয়, profile, address, type, lifecycle এবং Active/Inactive/Suspended status।
2. **Branch Operations:** GPS, location history, staff assignment, collection, payments এবং অন্যান্য business module-এর সংযোগ।
3. **Branch Intelligence:** target, achievement, performance, comparison, reports, forecast ও AI-assisted insights।
4. **Branch Governance:** authentication/authorization, roles, permissions, RLS, approval workflow, audit ও change history।
5. **Branch Extensions:** AI, notifications, camera, external API, GPS verification এবং ভবিষ্যৎ optional integration।

এই পাঁচ অংশের মধ্যে dependency স্পষ্টভাবে নথিভুক্ত থাকবে। Branch Module-এর এই নকশা প্রকল্পের সামগ্রিক Modular Architecture Charter-এর অধীন থাকবে।

## ৪. AI Governance — AI সিদ্ধান্ত-সহায়ক, নিয়ন্ত্রক নয়

AI পুরো Application বা ব্যবসার নিয়ন্ত্রক হবে না। AI কেবল অনুমোদিত ও permission-scoped তথ্য ব্যবহার করে বিশ্লেষণ, অস্বাভাবিকতা শনাক্তকরণ, পূর্বাভাস এবং সুপারিশ দেবে।

AI নিজে থেকে নিচের কাজগুলো করতে পারবে না:

- টাকা পরিশোধ বা আর্থিক লেনদেন সম্পন্ন/অনুমোদন
- Payment, ledger বা গুরুত্বপূর্ণ হিসাব পরিবর্তন/চূড়ান্ত করা
- Approval দেওয়া বা অনুমোদনকারীকে প্রতিস্থাপন করা
- কর্মীর Role বা Permission পরিবর্তন
- Branch বন্ধ, Suspend বা গুরুত্বপূর্ণ lifecycle পরিবর্তন
- Business record মুছে ফেলা বা authoritative data পরিবর্তন

এসব কাজ অনুমোদিত Backend নিয়ম, প্রয়োজনীয় Permission এবং মানুষের নিয়ন্ত্রণে সম্পন্ন হবে। AI output নিজে কোনো business approval বা authoritative record নয়।

### ৪.১ অনুমোদিত AI Feature-এর পরিসর

- **Anomaly Detection:** অস্বাভাবিক হিসাব, পরিমাণ বা কার্যক্রম শনাক্তে সহায়তা।
- **Smart GPS Verification:** অনুমোদিত location data-তে অসামঞ্জস্য শনাক্তে সহায়তা।
- **AI Report Assistant:** অনুমোদিত তথ্যের ভিত্তিতে ভাষাভিত্তিক রিপোর্ট তৈরি।
- **Performance Advisor:** শাখা/কেন্দ্রের উন্নতির সম্ভাব্য ক্ষেত্র ও করণীয় সুপারিশ।
- **Smart Alert Engine:** নির্ধারিত নিয়ম ও signal অনুযায়ী গুরুত্বপূর্ণ সতর্কতা।
- **AI Query Assistant:** সাধারণ ভাষায় প্রশ্নের মাধ্যমে অনুমোদিত ব্যবসায়িক তথ্য বোঝা।
- **Forecasting:** পর্যাপ্ত ও যাচাইকৃত historical data থাকলে সম্ভাব্য trend/target forecast।

AI-এর প্রতিটি ফলাফলে সম্ভব হলে data source, সময়সীমা, generation time, uncertainty/limitation এবং recommendation বনাম confirmed fact-এর পার্থক্য দেখাতে হবে। AI unavailable হলেও মূল business workflow চলতে হবে।

## ৫. Module Enable/Disable ও Permission Control

Module activation এবং user authorization দুটি পৃথক control plane হবে।

### ৫.১ Organization Owner Module Control

Organization Owner নির্ধারণ করবেন প্রতিষ্ঠানের জন্য কোন Module বা optional Feature চালু থাকবে। Module control organization scope-এ কার্যকর হবে।

### ৫.২ পৃথক User Permission

Module চালু থাকলেও প্রত্যেক ব্যবহারকারী তার অনুমোদিত Role, branch/center scope এবং action অনুযায়ীই কাজ করতে পারবেন। প্রয়োজনমতো View, Create, Edit, Submit, Approve, Export ও Manage permission আলাদা থাকবে।

### ৫.৩ Access সিদ্ধান্তের নিয়ম

কোনো কাজ অনুমোদিত হবে কেবল তখনই, যখন:
- সংশ্লিষ্ট Module/Feature organization-এর জন্য enabled;
- ব্যবহারকারীর প্রয়োজনীয় permission রয়েছে;
- ব্যবহারকারীর branch/center/data scope মেলে;
- Backend authorization ও validation সফল হয়;
- প্রয়োজন হলে approval সম্পন্ন হয়।

Module enabled থাকা একা user access-এর অনুমতি নয়। একইভাবে user permission থাকলেও Owner Module বন্ধ করলে সেই Module-এর নতুন কার্যক্রম চালানো যাবে না।

### ৫.৪ Module-এর অবস্থা

- **Enabled:** অনুমোদিত ব্যবহারকারীরা স্বাভাবিকভাবে কাজ করতে পারবেন।
- **Read-only:** পুরোনো তথ্য দেখা যাবে; নতুন business mutation বন্ধ থাকবে।
- **Disabled:** সাধারণ ব্যবহারকারীর কাছে Feature বন্ধ থাকবে; তার data/history অক্ষত থাকবে।

কোনো Module বন্ধ করার আগে dependency impact পরীক্ষা করতে হবে। বন্ধ/Read-only অবস্থায় প্রয়োজনীয় historical access, audit, retention ও financial reconciliation অক্ষুণ্ণ রাখতে হবে।

### ৫.৫ নিরাপত্তার অপরিহার্য অংশ

Authentication, central authorization, RLS, database integrity এবং মৌলিক audit/security controls-কে সাধারণ optional Feature-এর মতো সম্পূর্ণ বন্ধ করা যাবে না। Governance-এর optional workflow আলাদাভাবে নিয়ন্ত্রণযোগ্য হলেও মৌলিক নিরাপত্তা সক্রিয় থাকবে।

## ৬. Shared Platform Services

সব Module প্রয়োজন অনুযায়ী নিম্নলিখিত shared services ব্যবহার করবে:

- Authentication ও central authorization
- Organization/tenant ও branch/center scope
- API/Backend Function boundary
- Database access ও RLS
- Audit ও Event History
- Central Configuration ও Feature Control
- Notification infrastructure
- Offline queue, sync ও conflict handling
- Backup, restore ও data portability
- Logging, monitoring ও system health
- API versioning ও integration contracts

একটি Module অন্য Module-এর internal implementation-এ সরাসরি অপ্রয়োজনীয়ভাবে নির্ভর করবে না।

## ৭. ছয়টি বাধ্যতামূলক প্রযুক্তিগত সক্ষমতা

### ৭.১ Event History System
গুরুত্বপূর্ণ create/update/status/approval/permission/configuration ঘটনার actor, সময়, target record, outcome এবং যেখানে উপযুক্ত before/after values নথিভুক্ত হবে। Audit history নীরবে পরিবর্তন বা মুছে ফেলা যাবে না।

### ৭.২ Offline-First System
অনুমোদিত সীমার মধ্যে offline operation, local queue, retry, idempotency/duplicate prevention, conflict resolution ও sync status সমর্থন করতে হবে। Offline cache permission revocation বা server authorization পাশ কাটাতে পারবে না। বাস্তব TEST ছাড়া production sync সক্রিয় বলা যাবে না।

### ৭.৩ Branch/Module Dependency Manager
প্রতিটি Module/Feature-এর dependency, shared resource, data contract, disable impact এবং re-enable behavior নথিভুক্ত থাকবে। কোনো optional Module বন্ধ হলে নির্ভরশীল কাজের graceful fallback থাকতে হবে।

### ৭.৪ Central Configuration & Feature Control
Organization-level Module activation, feature flags, module-specific settings এবং user permissions আলাদা থাকবে। Configuration পরিবর্তন audit হবে এবং server-side enforcement ছাড়া UI toggle-কে কার্যকর control বলা যাবে না।

### ৭.৫ Data Quality Engine
Incomplete data, invalid values, duplicate candidates, inconsistent relationships, reconciliation mismatch ও suspicious patterns শনাক্ত করে report/alert দেবে। অনুমোদন ছাড়া সম্ভাব্য duplicate বা historical record স্বয়ংক্রিয়ভাবে delete/merge করা যাবে না।

### ৭.৬ Backend-Centric Business Logic
গুরুত্বপূর্ণ business mutation অনুমোদিত Backend API/Function দিয়ে authentication, authorization, validation, scope, idempotency এবং প্রয়োজনীয় approval যাচাই করে সম্পন্ন হবে। Frontend-এ service-role/secret key রাখা যাবে না। Database constraints ও RLS defense-in-depth হিসেবে থাকবে। AI সরাসরি authoritative database mutation করবে না।

## ৮. Branding ও Application Name পরিবর্তনযোগ্যতা

ভবিষ্যতে প্রয়োজন অনুযায়ী Application Name, logo, theme বা branding পরিবর্তন করা যাবে। Branding পরিবর্তন যেন project identity, organization identity, user account, branch identity, data relationship বা API contract ভেঙে না দেয়।

- Project/System identity স্থায়ী ও নাম-নিরপেক্ষ identifier দিয়ে চিহ্নিত হবে।
- Organization identity ও Application Branding পৃথক থাকবে।
- Branch, Farmer, Collection, Transaction ও অন্যান্য entity-র সম্পর্ক স্থায়ী ID-ভিত্তিক হবে; display name-ভিত্তিক নয়।
- Application Name, business display name, logo ও theme configuration থেকে পরিবর্তনযোগ্য হবে।
- Rebranding-এর জন্য Database বা business data নতুন করে তৈরি করা যাবে না।

## ৯. Data Integrity, Migration ও Backup Safety

1. বিদ্যমান schema, table, view, function, policy, relationship, data ও deployment architecture পরীক্ষা না করে নতুন migration চালানো যাবে না।
2. Logical table proposal-কে existing database-এর সঙ্গে তুলনা না করে duplicate table তৈরি করা যাবে না।
3. Existing table/data অকারণে drop, truncate, overwrite বা recreate করা যাবে না।
4. Migration-এর আগে schema comparison, dependency review, row/relationship checks, backup, TEST execution এবং rollback plan থাকতে হবে।
5. Production data-কে mock/test data ধরে নেওয়া যাবে না।
6. Backup তৈরি হওয়া restore-যোগ্যতার প্রমাণ নয়; restore test ও integrity verification আলাদাভাবে প্রয়োজন।
7. Module disable, rebrand বা module migration-এর সময় historical data, identifiers, audit ও financial relationships অক্ষত রাখতে হবে।

## ১০. Development, TEST ও Release Gate

প্রতিটি পরিবর্তনের জন্য প্রযোজ্য ধাপ:

**বর্তমান অবস্থা পর্যালোচনা → scope ও design অনুমোদন → backup/dependency review → isolated development change → TEST schema/RLS/JWT/business workflow → build/static validation → browser/mobile integration → regression ও recovery evidence → ফলাফল নথিভুক্ত → ব্যবহারকারীর স্পষ্ট release approval → তবেই merge/deploy।**

- ব্যবহারকারীর অনুমোদিত scope-এর বাইরে পরিবর্তন করা যাবে না।
- TEST proof ছাড়া Production schema/data/settings পরিবর্তন নয়।
- Failed বা Not-yet-tested check-কে Pass বলা যাবে না।
- Documentation update মানে feature implementation বা production enforcement সম্পন্ন—এমন নয়।
- প্রতিটি change-এ কী পরিবর্তিত হয়েছে, কী অপরিবর্তিত, কী পরীক্ষা হয়েছে, কী প্রমাণ আছে এবং কী বাকি—তা জানাতে হবে।
- ব্যবহারকারীর স্পষ্ট অনুমোদন ছাড়া PR merge, Production migration বা deployment নয়।

## ১১. Architecture Charter-এর প্রযোজ্যতা

এই Charter Branch, Farmer, Milk Collection, Quality, Processing, Accounts, Payments, Inventory, Feed, Veterinary, Agro, Employees, Reports এবং ভবিষ্যতে যুক্ত হওয়া সব Module/Service-এর জন্য প্রযোজ্য।

নতুন Module বা Feature প্রস্তাবের সময় তার দায়িত্ব, data ownership, API boundary, permission, dependency, enable/disable behavior, audit, offline behavior, AI involvement (যদি থাকে), test plan ও recovery impact এই Charter-এর সঙ্গে মিলিয়ে পর্যালোচনা করতে হবে।

## ১২. নথির অবস্থা ও সীমাবদ্ধতা

এই Charter ব্যবহারকারীর অনুমোদিত স্থাপত্য ও উন্নয়ননীতি নথিভুক্ত করে। GitHub-এ নথি সংরক্ষণ করা মানে এর প্রতিটি প্রযুক্তিগত সক্ষমতা ইতিমধ্যে কোডে বাস্তবায়িত, TEST-এ উত্তীর্ণ বা Production-এ সক্রিয়—এমন নয়। প্রতিটি সক্ষমতার implementation status আলাদা code review, test evidence ও release approval দিয়ে প্রমাণ করতে হবে।

**নীতিগত অঙ্গীকার:** মুহাইমিন প্রকল্পের ভবিষ্যৎ উন্নয়ন এই Charter অনুসরণ করবে; কোনো বাস্তবায়নগত ব্যতিক্রম প্রয়োজন হলে তা আগে আলোচনা ও স্পষ্ট অনুমোদনের মাধ্যমে নথিভুক্ত করতে হবে।
