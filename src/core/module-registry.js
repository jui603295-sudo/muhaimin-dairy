/* Muhaimin modular registry v1.
 * UI/navigation metadata only. Never use this registry as an authorization boundary:
 * Supabase RLS and server-side checks remain authoritative.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MuhaiminModuleRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const definitions = [
    { id: "core.dashboard", name: "ড্যাশবোর্ড", workspace: "core", status: "current", dependsOn: [] },
    { id: "core.branches", name: "শাখা ব্যবস্থাপনা", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "core.farmers", name: "কৃষক", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "milk-center", name: "দুধ কেন্দ্র", workspace: "milk-center", status: "current", dependsOn: ["core.dashboard", "core.farmers"] },
    { id: "milk-center.home", name: "দুধ কেন্দ্রের হোমপেজ", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "milk-center.settings", name: "দুধ কেন্দ্রের সেটিংস", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "milk-center.collection", name: "দুধ সংগ্রহ", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "milk-center.payments", name: "পেমেন্ট", workspace: "milk-center", status: "current", dependsOn: ["milk-center", "core.farmers"] },
    { id: "milk-center.quality-batch", name: "দুধের মান ও ব্যাচ", workspace: "milk-center", status: "current", dependsOn: ["milk-center", "milk-center.collection"] },
    { id: "milk-center.chiller", name: "চিলার লগ", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "milk-center.loss", name: "দুধের হিসাব/ক্ষতি", workspace: "milk-center", status: "current", dependsOn: ["milk-center", "milk-center.collection"] },
    { id: "milk-center.finance", name: "খরচ ও বিক্রয়", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "milk-center.cheese-home", name: "চিজ হোম", workspace: "milk-center", status: "current", dependsOn: ["milk-center"] },
    { id: "business.feed", name: "ফিড", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "business.veterinary", name: "ভেটেরিনারি", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "business.agro", name: "এগ্রো কেয়ার", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "business.reports", name: "রিপোর্ট", workspace: "business", status: "current", dependsOn: ["core.dashboard"] },
    { id: "business.farmer-ledger", name: "কৃষক লেজার", workspace: "business", status: "current", dependsOn: ["core.farmers"] },
    { id: "admin.settings", name: "সেটিংস", workspace: "admin", status: "current", dependsOn: ["core.dashboard"] },
    { id: "admin.audit-log", name: "অডিট লগ", workspace: "admin", status: "current", dependsOn: ["admin.settings"] },
    { id: "admin.backup-restore", name: "ব্যাকআপ ও পুনরুদ্ধার", workspace: "admin", status: "current", dependsOn: ["admin.settings"] },
    { id: "future.production", name: "দুগ্ধজাত উৎপাদন সম্প্রসারণ", workspace: "future", status: "planned", dependsOn: ["milk-center"] },
    { id: "future.supply-chain", name: "সরবরাহ ও অংশীদার", workspace: "future", status: "planned", dependsOn: ["core.branches"] },
    { id: "future.offline-sync", name: "অফলাইন সিঙ্ক", workspace: "future", status: "gated", dependsOn: ["milk-center"] },
    { id: "future.hardware", name: "যন্ত্রপাতি সংযোগ", workspace: "future", status: "gated", dependsOn: ["milk-center.quality-batch"] },
    { id: "future.ai", name: "ঐচ্ছিক AI সহায়তা", workspace: "future", status: "gated", dependsOn: ["core.dashboard"] }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validate(items) {
    const list = Array.isArray(items) ? items : definitions;
    const errors = [];
    const ids = new Set();
    list.forEach(function (item, index) {
      if (!item || typeof item.id !== "string" || !item.id.trim()) {
        errors.push("Module at index " + index + " has no valid id.");
        return;
      }
      if (ids.has(item.id)) errors.push("Duplicate module id: " + item.id);
      ids.add(item.id);
      if (!["current", "planned", "gated", "disabled"].includes(item.status)) {
        errors.push("Invalid status for " + item.id + ": " + item.status);
      }
      if (!Array.isArray(item.dependsOn)) errors.push("dependsOn must be an array: " + item.id);
    });
    list.forEach(function (item) {
      if (!item || typeof item.id !== "string" || !Array.isArray(item.dependsOn)) return;
      item.dependsOn.forEach(function (dependency) {
        if (!ids.has(dependency)) errors.push("Unknown dependency " + dependency + " in " + item.id);
      });
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function get(id) {
    const found = definitions.find(function (item) { return item.id === id; });
    return found ? clone(found) : null;
  }

  function list(options) {
    const opts = options || {};
    return definitions
      .filter(function (item) {
        return (!opts.workspace || item.workspace === opts.workspace) &&
          (!opts.status || item.status === opts.status);
      })
      .map(clone);
  }

  function dependencyOrder(items) {
    const listToSort = items || definitions;
    const check = validate(listToSort);
    if (!check.valid) throw new Error(check.errors.join("\n"));
    const byId = new Map(listToSort.map(function (item) { return [item.id, item]; }));
    const visited = new Set();
    const active = new Set();
    const result = [];
    function visit(id) {
      if (active.has(id)) throw new Error("Circular module dependency at: " + id);
      if (visited.has(id)) return;
      active.add(id);
      byId.get(id).dependsOn.forEach(visit);
      active.delete(id);
      visited.add(id);
      result.push(clone(byId.get(id)));
    }
    listToSort.forEach(function (item) { visit(item.id); });
    return result;
  }

  return Object.freeze({
    version: "1.0.0",
    list: list,
    get: get,
    validate: validate,
    dependencyOrder: dependencyOrder
  });
});
