/* Read-only bridge between the module registry and existing UI controls.
 * This annotates existing controls for diagnostics; it does not authorize access
 * or change visibility, routing, or persisted data.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MuhaiminModuleUIAudit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROUTES = Object.freeze({
    "core.dashboard": '[data-page="home"]',
    "core.branches": '[data-page="branches"]',
    "core.farmers": '[data-page="farmers"]',
    "milk-center": '[data-page="collection"]',
    "milk-center.home": '[data-milk-page="milkHome"]',
    "milk-center.settings": '[data-milk-page="milkSettings"]',
    "milk-center.collection": '[data-milk-page="collection"]',
    "milk-center.payments": '[data-milk-page="payments"]',
    "milk-center.quality-batch": '[data-milk-page="operations"]',
    "milk-center.chiller": '[data-milk-page="chiller"]',
    "milk-center.loss": '[data-milk-page="loss"]',
    "milk-center.finance": '[data-milk-page="finance"]',
    "milk-center.cheese-home": '[data-milk-page="cheeseHome"]',
    "business.feed": '[data-page="feed"]',
    "business.veterinary": '[data-page="vet"]',
    "business.agro": '[data-page="agro"]',
    "business.reports": '[data-page="reports"]',
    "business.farmer-ledger": '[data-page="ledger"]',
    "admin.settings": '[data-page="settings"]',
    "admin.audit-log": '[data-page="audit"]',
    "admin.backup-restore": '[data-page="backup"]'
  });

  const WORKSPACE_PAGES = Object.freeze({
    "milk-center.home": "milkHome",
    "milk-center.settings": "milkSettings",
    "milk-center.collection": "collection",
    "milk-center.payments": "payments",
    "milk-center.quality-batch": "operations",
    "milk-center.chiller": "chiller",
    "milk-center.loss": "loss",
    "milk-center.finance": "finance",
    "milk-center.cheese-home": "cheeseHome"
  });

  function run(registry, documentLike) {
    const errors = [];
    if (!registry || typeof registry.list !== "function" || typeof registry.validate !== "function") {
      return { valid: false, checked: 0, missing: [], errors: ["Module registry is unavailable"] };
    }
    const validation = registry.validate();
    if (!validation.valid) errors.push.apply(errors, validation.errors);
    const doc = documentLike || (typeof document !== "undefined" ? document : null);
    if (!doc || typeof doc.querySelector !== "function") {
      return { valid: false, checked: 0, missing: [], errors: errors.concat(["Document is unavailable"]) };
    }

    const missing = [];
    let checked = 0;
    registry.list({ status: "current" }).forEach(function (module) {
      const selector = ROUTES[module.id];
      if (!selector) {
        missing.push({ id: module.id, selector: null, reason: "No UI route mapping" });
        return;
      }
      const element = doc.querySelector(selector);
      if (!element) {
        missing.push({ id: module.id, selector: selector, reason: "UI control not found" });
        return;
      }
      const workspacePage = WORKSPACE_PAGES[module.id];
      if (workspacePage && (typeof doc.getElementById !== "function" || !doc.getElementById(workspacePage))) {
        missing.push({ id: module.id, selector: "#"+workspacePage, reason: "Workspace page not found" });
        return;
      }
      checked += 1;
      if (typeof element.setAttribute === "function") {
        element.setAttribute("data-module-id", module.id);
        element.setAttribute("data-module-status", module.status);
      }
    });
    return { valid: errors.length === 0 && missing.length === 0, checked: checked, missing: missing, errors: errors };
  }

  return Object.freeze({ routes: ROUTES, run: run });
});
