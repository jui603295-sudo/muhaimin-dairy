const fs = require("node:fs");
const assert = require("node:assert/strict");
const html = fs.readFileSync("index.html", "utf8");

assert.equal((html.match(/id="cheeseHome"/g) || []).length, 1, "Cheese Home page ID must be unique");
assert.match(html, /data-milk-page="cheeseHome"/, "Milk Center navigation must expose Cheese Home");
assert.match(html, /id="cheeseLeadForm"/, "Local contact form must exist");
assert.match(html, /function cheeseEscape\(/, "User-entered text must be escaped before HTML rendering");
assert.match(html, /CHEESE_LEADS_KEY\+userId/, "Local notes must be scoped by signed-in user");
assert.match(html, /Supabase বা অন্য ডিভাইসে সিঙ্ক হয় না/, "Local-only limitation must be visible");
assert.match(html, /get\("env"\) === "test"/, "TEST mode must require explicit selection");
assert.match(html, /MUHAIMIN_TEST_URL === MUHAIMIN_PRODUCTION_URL/, "TEST must reject Production URL");
assert.match(html, /MUHAIMIN_TEST_KEY === MUHAIMIN_PRODUCTION_KEY/, "TEST must reject Production key");
assert.match(html, /throw new Error\("TEST environment blocked/, "Invalid TEST config must fail closed before client creation");
assert.match(html, /const sb = supabase\.createClient\(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY\)/, "Client must use the validated environment constants");
assert.match(fs.readFileSync("src/core/supabase-test-config.example.js", "utf8"), /YOUR-TEST-PROJECT-REF/);
assert.match(fs.readFileSync(".gitignore", "utf8"), /src\/core\/supabase-test-config\.js/);
console.log("Cheese Home and TEST Supabase static checks passed.");
