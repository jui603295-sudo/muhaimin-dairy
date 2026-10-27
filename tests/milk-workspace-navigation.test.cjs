"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf('<style id="milkWorkspaceHorizontalLayout">');
const end = html.indexOf("</style>", start);
assert.ok(start >= 0 && end > start, "Milk Center layout style must exist");
const css = html.slice(start, end);

assert.ok(css.includes("body.milk-center-mode .page:not(.active){display:none!important}"),
  "Only the active page should be visible inside Milk Center");
assert.ok(css.includes("body.milk-center-mode .page.active{display:block!important;min-width:0}"),
  "The selected Milk Center page should be visible");
assert.ok(css.includes("overflow-x:auto"), "Milk Center navigation should scroll horizontally on mobile");
assert.ok(css.includes("overscroll-behavior-x:contain"), "Horizontal navigation should contain overscroll");
assert.ok(html.includes('data-milk-page="cheeseHome"'), "Cheese Home must remain reachable from Milk Center");
assert.ok(html.includes('<section id="cheeseHome" class="page">'), "Cheese Home page must exist");

const targets = [...html.matchAll(/data-milk-page="([^"]+)"/g)].map(match => match[1]);
for (const target of new Set(targets)) {
  assert.ok(
    html.includes('<section id="' + target + '" class="page"') ||
      html.includes('<section id="' + target + '" class="page active"'),
    "Every Milk Center navigation target must resolve to a page section: " + target
  );
}

console.log("PASS: Milk Center active-page, mobile navigation, and target mapping checks");
