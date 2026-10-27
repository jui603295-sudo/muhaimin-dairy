# TEST Supabase environment isolation

- Production remains the default when the app is opened normally.
- TEST mode is selected explicitly with `?env=test`.
- In TEST mode, the app requires a separate TEST project URL and anon/publishable key from the local-only `src/core/supabase-test-config.js` file.
- Copy `src/core/supabase-test-config.example.js` to that filename and replace the placeholders with credentials for a separate TEST project.
- The local file is listed in `.gitignore`; never commit real credentials.
- If TEST configuration is missing, malformed, or matches the Production URL/key, app startup is blocked before Supabase client creation. It must never fall back to Production.
- This guard only isolates the client configuration. It does not prove TEST project health, JWT/RLS behavior, database CRUD, or Android runtime behavior; those still require separate verification.
