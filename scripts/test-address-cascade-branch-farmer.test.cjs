"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("// Bangladesh address cascade.");
const end = html.indexOf("// Branch GPS:", start);
if (start < 0 || end < 0) throw new Error("Could not locate address cascade implementation");

const tree = [{
  bn_name: "রংপুর",
  districts: [{
    bn_name: "ঠাকুরগাঁও",
    upazilas: [{
      bn_name: "ঠাকুরগাঁও সদর",
      unions: [{ bn_name: "রুহিয়া" }, { bn_name: "আকচা" }],
      pourashavas: [{ bn_name: "ঠাকুরগাঁও পৌরসভা" }]
    }, {
      bn_name: "পীরগঞ্জ",
      unions: [{ bn_name: "ভোমরাদহ" }],
      pourashavas: [{ bn_name: "পীরগঞ্জ পৌরসভা" }]
    }]
  }]
}];

class MockOption {
  constructor(text, value) { this.text = text; this.value = value; }
}
class MockEvent { constructor(type) { this.type = type; } }
class MockSelect {
  constructor() { this.options = []; this._value = ""; this.listeners = {}; }
  get value() { return this._value; }
  set value(value) { this._value = this.options.some(option => option.value === value) ? value : ""; }
  replaceChildren(option) { this.options = [option]; this._value = ""; }
  add(option) { this.options.push(option); }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  dispatchEvent(event) { this.listeners[event.type]?.(event); }
}
function makeHarness({ cachedTree = tree, fetchImpl } = {}) {
  const ids = ["branchDivision","branchDistrict","branchUpazila","branchUnion","branchAddressStatus",
    "farmerDivision","farmerDistrict","farmerUpazila","farmerUnion","farmerAddressStatus"];
  const elements = Object.fromEntries(ids.map(id => [id, id.endsWith("Status") ? { textContent: "" } : new MockSelect()]));
  const store = new Map();
  if (cachedTree !== null) store.set("muhaimin_bd_address_tree_v1", JSON.stringify(cachedTree));
  const localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
    removeItem(key) { store.delete(key); }
  };
  const context = {
    document: { getElementById(id) { return elements[id] || null; } },
    localStorage,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    Option: MockOption, Event: MockEvent, Array, Set, JSON, Promise, Error
  };
  vm.runInNewContext(html.slice(start, end) + "\\nglobalThis.__addressCascadeReady = addressCascadeReady; globalThis.__addressCascadeControllers = addressCascadeControllers;", context, { timeout: 1000 });
  return { elements, store, context };
}

test("Branch and Farmer cascades populate Thakurgaon district, upazila and union/pourashava", async () => {
  const h = makeHarness();
  await Promise.all([h.context.__addressCascadeReady.branch, h.context.addressCascadeReady.farmer]);
  for (const prefix of ["branch", "farmer"]) {
    const division = h.elements[prefix + "Division"];
    const district = h.elements[prefix + "District"];
    const upazila = h.elements[prefix + "Upazila"];
    const union = h.elements[prefix + "Union"];
    division.value = "রংপুর";
    division.dispatchEvent(new MockEvent("change"));
    assert.ok(district.options.some(x => x.value === "ঠাকুরগাঁও"));
    district.value = "ঠাকুরগাঁও";
    district.dispatchEvent(new MockEvent("change"));
    assert.ok(upazila.options.some(x => x.value === "ঠাকুরগাঁও সদর"));
    upazila.value = "ঠাকুরগাঁও সদর";
    upazila.dispatchEvent(new MockEvent("change"));
    assert.ok(union.options.some(x => x.value === "আকচা"));
    assert.ok(union.options.some(x => x.value === "ঠাকুরগাঁও পৌরসভা"));
  }
});

test("Edit controller restores saved address only when each value belongs to its parent", async () => {
  const h = makeHarness();
  await h.context.addressCascadeReady.branch;
  const restored = h.context.__addressCascadeControllers.branch({
    division: "রংপুর", district: "ঠাকুরগাঁও", upazila: "ঠাকুরগাঁও সদর", union_name: "আকচা"
  });
  assert.equal(restored.division, "রংপুর");
  assert.equal(restored.district, "ঠাকুরগাঁও");
  assert.equal(restored.upazila, "ঠাকুরগাঁও সদর");
  assert.equal(restored.union_name, "আকচা");
  const invalid = h.context.addressCascadeControllers.branch({
    division: "রংপুর", district: "ঠাকুরগাঁও", upazila: "পীরগঞ্জ", union_name: "আকচা"
  });
  assert.equal(invalid.union_name, "");
});

test("Malformed cache is removed, valid live data is fetched once and shared by both forms", async () => {
  let calls = 0;
  const malformed = [{ bn_name: "রংপুর", districts: [{ bn_name: "ঠাকুরগাঁও", upazilas: "bad" }] }];
  const h = makeHarness({
    cachedTree: malformed,
    fetchImpl: async () => { calls++; return { ok: true, json: async () => tree }; }
  });
  await Promise.all([h.context.addressCascadeReady.branch, h.context.addressCascadeReady.farmer]);
  assert.equal(calls, 1);
  assert.ok(h.elements.branchDivision.options.some(x => x.value === "রংপুর"));
  assert.ok(h.elements.farmerDivision.options.some(x => x.value === "রংপুর"));
  assert.equal(JSON.parse(h.store.get("muhaimin_bd_address_tree_v1"))[0].bn_name, "রংপুর");
});

test("Network failure reports a useful error instead of leaving a silent empty dropdown", async () => {
  const h = makeHarness({ cachedTree: null, fetchImpl: async () => ({ ok: false, status: 503 }) });
  await Promise.all([
    h.context.addressCascadeReady.branch.catch(() => null),
    h.context.addressCascadeReady.farmer.catch(() => null)
  ]);
  assert.match(h.elements.branchAddressStatus.textContent, /ঠিকানা তালিকা লোড করা যায়নি/);
  assert.match(h.elements.farmerAddressStatus.textContent, /ইন্টারনেট সংযোগ পরীক্ষা/);
});
