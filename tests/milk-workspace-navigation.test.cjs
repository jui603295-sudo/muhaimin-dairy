"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const navTargets = [...html.matchAll(/<button\\b[^>]*\\bdata-milk-page="([^"]+)"[^>]*>/g)].map(match => match[1]);
assert.ok(navTargets.length >= 8, "Milk Center should expose its workspace navigation and home tiles");

const uniqueTargets = [...new Set(navTargets)];
assert.equal(uniqueTargets.length, navTargets.length, "Each data-milk-page target should be represented once in the combined navigation/tile set only if duplicates are not used");

for (const target of uniqueTargets) {
  const sectionPattern = new RegExp('<section\\\\b(?=[^>]*\\\\bid="' + target + '")(?=[^>]*\\\\bclass="[^"]*\\\\bpage\\\\b[^"]*")[^>]*>');
  assert.match(html, sectionPattern, "Missing workspace page section for data-milk-page target: " + target);
}

assert.match(html, /body\\.milk-center-mode\\.page-never-match/, "placeholder");
console.log("PASS: Milk Center navigation targets resolve to workspace page sections");
