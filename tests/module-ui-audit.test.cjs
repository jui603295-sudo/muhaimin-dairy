"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const registry = require("../src/core/module-registry.js");
const audit = require("../src/core/module-ui-audit.js");

const indexPath = path.join(__dirname, "..", "index.html");
const swPath = path.join(__dirname, "..", "sw.js");
const html = fs.readFileSync(indexPath, "utf8");
const sw = fs.readFileSync(swPath, "utf8");
assert.ok(html.includes('<script src="./src/core/module-registry.js"></script>'));
assert.ok(html.includes('<script src="./src/core/module-ui-audit.js"></script>'));
assert.ok(html.includes("MuhaiminModuleUIAudit.run(window.MuhaiminModuleRegistry)"));
assert.ok(html.includes('document.querySelectorAll("#nav button").forEach(button=>button.addEventListener("click"'));
assert.ok(html.includes('document.querySelectorAll("[data-milk-page]").forEach(button=>button.addEventListener("click"'));
assert.ok(html.includes('<button type="button" data-milk-page="cheeseHome">🧀 চিজ হোম</button>'), "Cheese Home must be present in Milk Center workspace navigation");
assert.ok(html.includes('<button type="button" class="milk-workspace-tile" data-milk-page="cheeseHome">'), "Cheese Home must be available as a Milk Center home tile");
assert.ok(html.includes('<section id="cheeseHome" class="page">'), "Cheese Home workspace page must exist");
assert.ok(html.includes('document.querySelectorAll("[data-milk-settings]")'), "Milk Center settings shortcut must remain wired");
assert.ok(html.includes('const target=requested==="collection"?"milkHome":requested;'));
assert.ok(html.includes('document.body.classList.toggle("milk-center-mode",requested==="collection");'));
assert.ok(html.includes('document.body.classList.toggle("milk-workspace-detail",target!=="milkHome");'));
assert.ok(html.includes('function exitMilkWorkspace(){document.body.classList.remove("milk-center-mode");'));
assert.ok(sw.includes('"./src/core/module-registry.js"'));
assert.ok(sw.includes('"./src/core/module-ui-audit.js"'));

const attributes = new Map();
const documentLike = {
  querySelector(selector) {
    if (!Object.values(audit.routes).includes(selector)) return null;
    const parts = selector.slice(1, -1).split("=");
    const attribute = parts[0];
    const value = parts.slice(1).join("=").slice(1, -1);
    if (!attribute || !value || !html.includes(attribute + '="' + value + '"')) return null;
    return {
      setAttribute(name, value) {
        attributes.set(selector + "::" + name, value);
      }
    };
  },
  getElementById(id) {
    return html.includes('id="' + id + '"') ? { id } : null;
  }
};
for (const selector of Object.values(audit.routes)) {
  const parts = selector.slice(1, -1).split("=");
  const attribute = parts[0];
  const value = parts.slice(1).join("=").slice(1, -1);
  assert.ok(attribute && value && html.includes(attribute + '="' + value + '"'), "Missing real UI selector: " + selector);
}
const result = audit.run(registry, documentLike);
assert.equal(result.valid, true, JSON.stringify(result.missing));
assert.ok(result.checked >= 15);
assert.equal(attributes.get('[data-milk-page="cheeseHome"]::data-module-id'), "milk-center.cheese-home");
assert.equal(attributes.get('[data-milk-page="cheeseHome"]::data-module-status'), "current");
assert.equal(attributes.get('[data-milk-page="milkHome"]::data-module-id'), "milk-center.home");
assert.equal(attributes.get('[data-milk-page="milkSettings"]::data-module-id'), "milk-center.settings");

const missingRoute = audit.run(registry, { querySelector: () => null });
assert.equal(missingRoute.valid, false);
assert.ok(missingRoute.missing.some(item => item.id === "milk-center.cheese-home"));

const missingWorkspacePage = audit.run(registry, {
  querySelector(selector) {
    return Object.values(audit.routes).includes(selector) ? { setAttribute() {} } : null;
  },
  getElementById(id) {
    return id === "cheeseHome" ? null : { id };
  }
});
assert.equal(missingWorkspacePage.valid, false);
assert.ok(missingWorkspacePage.missing.some(item => item.id === "milk-center.cheese-home" && item.reason === "Workspace page not found"));
console.log("PASS: existing UI routes are mapped to the module registry");
