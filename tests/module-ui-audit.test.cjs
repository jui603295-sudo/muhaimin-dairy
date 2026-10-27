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
assert.ok(html.includes("MuhaiminModuleUIAudit.run()"));
assert.ok(sw.includes('"./src/core/module-registry.js"'));
assert.ok(sw.includes('"./src/core/module-ui-audit.js"'));

const attributes = new Map();
const documentLike = {
  querySelector(selector) {
    if (!Object.values(audit.routes).includes(selector)) return null;
    const match = selector.match(/^\\[([^=]+)="([^"]+)"\\]$/);
    if (!match || !html.includes(match[1] + '="' + match[2] + '"')) return null;
    return {
      setAttribute(name, value) {
        attributes.set(selector + "::" + name, value);
      }
    };
  }
};
for (const selector of Object.values(audit.routes)) {
  const match = selector.match(/^\\[([^=]+)="([^"]+)"\\]$/);
  assert.ok(match && html.includes(match[1] + '="' + match[2] + '"'), "Missing real UI selector: " + selector);
}
const result = audit.run(registry, documentLike);
assert.equal(result.valid, true, JSON.stringify(result.missing));
assert.ok(result.checked >= 15);
assert.equal(attributes.get('[data-milk-page="cheeseHome"]::data-module-id'), "milk-center.cheese-home");
assert.equal(attributes.get('[data-milk-page="cheeseHome"]::data-module-status'), "current");

const missingRoute = audit.run(registry, { querySelector: () => null });
assert.equal(missingRoute.valid, false);
assert.ok(missingRoute.missing.some(item => item.id === "milk-center.cheese-home"));
console.log("PASS: existing UI routes are mapped to the module registry");
