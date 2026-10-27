# TEST Supabase environment isolation

## Safety guarantee
- Normal app launch uses the existing Production Supabase configuration.
- Launching with `?env=test` selects TEST mode only.
- TEST mode loads `src/core/supabase-test-config.js`, which is intentionally local-only and ignored by Git.
- If the local TEST config is missing or invalid, the app displays a blocking message and throws before creating a Supabase client. It must not fall back to Production.

## Local setup
1. Confirm the separate Supabase TEST project is active and record its Project URL and anon/publishable key from that TEST project only.
2. Copy `src/core/supabase-test-config.example.js` to `src/core/supabase-test-config.js`.
3. Replace both placeholders with the TEST project's URL and anon/publishable key. Never use the Production URL/key here and never commit the local file.
4. Serve the app locally and open it with `?env=test`.
5. In browser DevTools Network, verify requests go only to the TEST project host. If config is absent, the expected result is a blocked app and no Supabase client request.
6. Run JWT/RLS and CRUD tests only after the TEST project is active and the test account/role matrix is prepared.

## Limitations
This guard and its static test do not prove live JWT/RLS behavior, database schema correctness, Android device behavior, or that a TEST project is active. Those require separate evidence. No Production database changes are part of this change.
