"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const navTargets = [...html.matchAll(/data-milk-page="([^"]+)"/g)].map(match => match[1]);
assert.ok(navTargets.length >= 8, "Milk Center should expose workspace navigation and home tiles");

const uniqueTargets = [...new Set(navTargets)];
assert.ok(uniqueTargets.length >= 8, "Expected all Milk Center workspace destinations");

for (const target of uniqueTargets) {
  assert.ok(
    html.includes('<section id="' + target + '" class="page"') ||
      html.includes('<section id="' + target + '" class="page active"'),
    "Missing workspace page section for data-milk-page target: " + target
  );
}

assert.ok(html.includes("body.milk-center-mode .page:not(.active){display:none!important}"),
  "Inactive pages must be hidden inside the Milk Center workspace");
assert.ok(html.includes("body.milk-center-mode .page.active{display:block!important}"),
  "The active page must remain visible inside the Milk Center workspace");

console.log("PASS: Milk Center navigation targets resolve to workspace page sections");
