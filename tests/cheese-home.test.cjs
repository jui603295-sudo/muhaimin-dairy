"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf('<section id="cheeseHome"');
const end = html.indexOf('</section>', start);
assert.ok(start >= 0 && end > start, "Cheese Home page must exist");
const section = html.slice(start, end);
for (const id of ["cheeseLeadForm", "cheeseLeadStatus", "cheeseLeadTable"]) {
  assert.ok(section.includes('id="' + id + '"'), "Cheese Home local notebook is missing " + id);
}
for (const name of ["name", "kind", "contact", "phone", "liters", "clr", "notes"]) {
  assert.ok(section.includes('name="' + name + '"'), "Cheese Home form is missing " + name);
}
assert.ok(section.includes("শুধু এই ব্রাউজার/ফোনে থাকবে"), "Local-only storage limitation must be visible");
assert.ok(section.includes("সার্ভার-সংরক্ষিত ব্যবসায়িক রেকর্ড হিসেবে ব্যবহার করবেন না"), "Do not misrepresent local drafts as server records");
assert.ok(html.includes('const CHEESE_LEADS_KEY = "muhaimin-cheese-leads-v1:"'), "Local lead storage key must be scoped");
assert.ok(html.includes("function cheeseEscape(value)"), "User-entered text must be escaped before rendering");
assert.ok(html.includes("localStorage.setItem(cheeseLeadsStorageKey(),JSON.stringify(leads))"), "Local draft persistence must exist");
assert.ok(html.includes('data-cheese-delete'), "Delete control must be rendered");
assert.ok(html.includes("renderCheeseLeads();"), "Cheese Home list renderer must be wired");
assert.ok(html.includes("renderCheeseLeads();\n  loadGeneralSettingsDraft();"), "List must reload after signed-in user scoping");
console.log("PASS: Cheese Home local prospect notebook UI and safeguards");
