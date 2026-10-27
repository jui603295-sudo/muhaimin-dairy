"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && body.trim());
const source = scripts.map(([, , body]) => body);
const helpers = source.find(body => body.includes("const bdParts =") && body.includes("const dateISO ="));
assert.ok(helpers, "Core date and formatting helpers must exist in the app");
const start = helpers.indexOf("const bdParts =");
const end = helpers.indexOf("const translations =");
assert.ok(start >= 0 && end > start, "Expected bounded core helper section");
const snippet = helpers.slice(start, end) + "\nglobalThis.__testApi = { bdParts, today, dateDisplay, dateISO, formatDateTyping, dateTimeBD, storedTime, esc, phoneHref };";
const context = { Intl, Date, Object, String, Number, Math, localStorage: { getItem: () => "bn" } };
vm.createContext(context);
vm.runInContext(snippet, context, { timeout: 1000 });
const api = context.__testApi;

assert.equal(api.dateISO("28-10-2026"), "2026-10-28", "DD-MM-YYYY must convert to ISO");
assert.equal(api.dateISO("2026-10-28"), "2026-10-28", "ISO date must remain valid");
assert.equal(api.dateISO("31-02-2026"), "", "Impossible calendar dates must be rejected");
assert.equal(api.dateISO("2026-13-01"), "", "Invalid ISO month must be rejected");
assert.equal(api.dateDisplay("2026-10-28T00:00:00Z"), "28-10-2026", "Display dates must use DD-MM-YYYY");
assert.equal(api.formatDateTyping("28102026"), "28-10-2026", "Eight digits must format as DD-MM-YYYY");
assert.equal(api.formatDateTyping("2810"), "28-10", "Partial date input must remain editable");
assert.equal(api.dateTimeBD("2026-01-01T00:00:00Z"), "01/01/2026 06:00:00", "Timestamp display must use Asia/Dhaka");
assert.equal(api.storedTime("09:12:00", null), "09:12:00", "Valid stored time must be preserved");
assert.equal(api.phoneHref("01712345678"), "tel:+8801712345678", "Bangladesh mobile number must produce a normalized call link");
assert.equal(api.phoneHref(""), "", "Empty phone number must not create a call link");
assert.equal(api.esc("<script>\"&'"), "&lt;script&gt;&quot;&amp;&#039;", "HTML-sensitive characters must be escaped");
console.log("PASS: 12 core data-validation scenarios (date parsing/display/typing, invalid dates, Bangladesh time, stored time, phone links, and HTML escaping).");
