"use strict";
const assert = require("node:assert/strict");
const registry = require("../src/core/module-registry.js");

assert.equal(registry.version, "1.0.0");
assert.equal(registry.validate().valid, true, registry.validate().errors.join("; "));
assert.ok(registry.get("milk-center.cheese-home"));
assert.equal(registry.get("milk-center.cheese-home").workspace, "milk-center");
assert.equal(registry.list({ workspace: "milk-center" }).some(x => x.id === "milk-center.cheese-home"), true);
assert.equal(registry.get("future.offline-sync").status, "gated");
assert.equal(registry.get("future.ai").status, "gated");
assert.equal(registry.get("no.such.module"), null);

const duplicate = registry.validate([
  { id: "x", status: "current", dependsOn: [] },
  { id: "x", status: "current", dependsOn: [] }
]);
assert.equal(duplicate.valid, false);
assert.ok(duplicate.errors.some(e => e.includes("Duplicate module id")));

const missingDependency = registry.validate([
  { id: "x", status: "current", dependsOn: ["missing"] }
]);
assert.equal(missingDependency.valid, false);
assert.ok(missingDependency.errors.some(e => e.includes("Unknown dependency")));

assert.throws(() => registry.dependencyOrder([
  { id: "a", status: "current", dependsOn: ["b"] },
  { id: "b", status: "current", dependsOn: ["a"] }
]), /Circular module dependency/);

const ordered = registry.dependencyOrder();
const positions = new Map(ordered.map((item, index) => [item.id, index]));
for (const item of ordered) {
  for (const dep of item.dependsOn) assert.ok(positions.get(dep) < positions.get(item.id));
}
console.log("PASS: Muhaimin module registry validation and dependency-order tests");
