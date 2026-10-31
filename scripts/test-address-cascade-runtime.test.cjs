"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("// Bangladesh address cascade.");
const end = html.indexOf("// Branch GPS:", start);
if (start < 0 || end < 0) throw new Error("Could not locate address cascade implementation in index.html");
const source = html.slice(start, end);

const tree = [
  { bn_name: "রংপুর", districts: [
    { bn_name: "ঠাকুরগাঁও", upazilas: [
      { bn_name: "ঠাকুরগাঁও সদর", unions: [{ bn_name: "আকচা" }, { bn_name: "রুহিয়া" }], pourashavas: [{ bn_name: "ঠাকুরগাঁও পৌরসভা" }] },
      { bn_name: "পীরগঞ্জ", unions: [{ bn_name: "ভোমরাদহ" }] }
    ] }
  ] },
  { bn_name: "ঢাকা", districts: [
    { bn_name: "ঢাকা", upazilas: [{ bn_name: "সাভার", unions: [{ bn_name: "আমিনবাজার" }] }] }
  ] }
];

class MockOption {
  constructor(text, value) { this.text = text; this.value = value; }
}
class MockEvent { constructor(type) { this.type = type; } }
class MockSelect {
  constructor(initial = []) {
    this.options = initial.map(x => new MockOption(x, x));
    this.value = "";
    this.listeners = {};
  }
  replaceChildren(option) { this.options = [option]; this.value = ""; }
  add(option) { this.options.push(option); }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  dispatchEvent(event) { this.listeners[event.type]?.(event); }
}
function makeHarness({ cachedTree = tree, fetchImpl } = {}) {
  const ids = ["branchDivision", "branchDistrict", "branchUpazila", "branchUnion", "branchAddressStatus",
    "farmerDivision", "farmerDistrict", "farmerUpazila", "farmerUnion", "farmerAddressStatus"];
  const elements = Object.fromEntries(ids.map(id => [id, id.endsWith("Status")
    ? { textContent: "" }
    : new MockSelect(id.endsWith("Division") ? ["বিভাগ নির্বাচন"] : [])]));
  const store = new Map();
  if (cachedTree) store.set("muhaimin_bd_address_tree_v1", JSON.stringify(cachedTree));
  const localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
    removeItem(key) { store.delete(key); }
  };
  const context = {
    document: { getElementById(id) { return elements[id] || null; } },
    localStorage, fetch: fetchImpl || (() => { throw new Error("unexpected fetch"); }),
    Option: MockOption, Event: MockEvent, Array, Set, JSON, Promise, Error
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  return { elements, store, context };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
async function ready(h) { await settle(); await settle(); }

test("loads address tree from local cache without network request", async () => {
  let calls = 0;
  const h = makeHarness({ fetchImpl: async () => { calls++; throw new Error("should not fetch"); } });
  await ready(h);
  assert.equal(calls, 0);
  assert.ok(h.elements.branchDivision.options.some(o => o.value === "রংপুর"));
  assert.match(h.elements.branchAddressStatus.textContent, /ঠিকানা তালিকা প্রস্তুত/);
  assert.ok(h.elements.farmerDivision.options.some(o => o.value === "ঢাকা"));
});

test("Thakurgaon address cascade populates district, upazila and union/pourashava", async () => {
  const h = makeHarness();
  await ready(h);
  const division = h.elements.branchDivision, district = h.elements.branchDistrict;
  const upazila = h.elements.branchUpazila, union = h.elements.branchUnion;
  division.value = "রংপুর"; division.dispatchEvent(new MockEvent("change"));
  assert.deepEqual(district.options.map(o => o.value), ["", "ঠাকুরগাঁও"]);
  district.value = "ঠাকুরগাঁও"; district.dispatchEvent(new MockEvent("change"));
  assert.ok(upazila.options.some(o => o.value === "ঠাকুরগাঁও সদর"));
  assert.ok(upazila.options.some(o => o.value === "পীরগঞ্জ"));
  upazila.value = "ঠাকুরগাঁও সদর"; upazila.dispatchEvent(new MockEvent("change"));
  assert.ok(union.options.some(o => o.value === "আকচা"));
  assert.ok(union.options.some(o => o.value === "রুহিয়া"));
  assert.ok(union.options.some(o => o.value === "ঠাকুরগাঁও পৌরসভা"));
});

test("changing a parent selection clears dependent selections and stale child values", async () => {
  const h = makeHarness();
  await ready(h);
  const d = h.elements.branchDivision, ds = h.elements.branchDistrict, u = h.elements.branchUpazila, un = h.elements.branchUnion;
  d.value = "রংপুর"; d.dispatchEvent(new MockEvent("change"));
  ds.value = "ঠাকুরগাঁও"; ds.dispatchEvent(new MockEvent("change"));
  u.value = "ঠাকুরগাঁও সদর"; u.dispatchEvent(new MockEvent("change"));
  un.value = "আকচা";
  d.value = "ঢাকা"; d.dispatchEvent(new MockEvent("change"));
  assert.equal(ds.value, "");
  assert.deepEqual(ds.options.map(o => o.value), ["", "ঢাকা"]);
  assert.equal(u.value, "");
  assert.equal(un.value, "");
  assert.equal(u.options.length, 1);
  assert.equal(un.options.length, 1);
});

test("combines unions and pourashavas without duplicate labels", async () => {
  const duplicateTree = [{ bn_name: "বিভাগ", districts: [{ bn_name: "জেলা", upazilas: [{
    bn_name: "উপজেলা", unions: [{ bn_name: "এক" }, { bn_name: "এক" }],
    pourashavas: [{ bn_name: "এক" }, { bn_name: "পৌরসভা" }]
  }] }] }];
  const h = makeHarness({ cachedTree: duplicateTree });
  await ready(h);
  const d=h.elements.branchDivision, ds=h.elements.branchDistrict, u=h.elements.branchUpazila, un=h.elements.branchUnion;
  d.value="বিভাগ"; d.dispatchEvent(new MockEvent("change"));
  ds.value="জেলা"; ds.dispatchEvent(new MockEvent("change"));
  u.value="উপজেলা"; u.dispatchEvent(new MockEvent("change"));
  assert.deepEqual(un.options.map(o=>o.value), ["", "এক", "পৌরসভা"]);
});

test("network failure is surfaced instead of silently presenting an empty address list", async () => {
  const h = makeHarness({ cachedTree: null, fetchImpl: async () => ({ ok: false, status: 503 }) });
  await ready(h);
  assert.match(h.elements.branchAddressStatus.textContent, /ঠিকানা তালিকা লোড করা যায়নি/);
  assert.match(h.elements.farmerAddressStatus.textContent, /ইন্টারনেট সংযোগ পরীক্ষা/);
});

test("malformed downloaded data is rejected and not cached", async () => {
  const h = makeHarness({ cachedTree: null, fetchImpl: async () => ({ ok: true, json: async () => ({ districts: [] }) }) });
  await ready(h);
  assert.match(h.elements.branchAddressStatus.textContent, /ফরম্যাট সঠিক নয়/);
  assert.equal(h.store.has("muhaimin_bd_address_tree_v1"), false);
});

test("rejects a malformed cached tree, removes it, and recovers from a valid download", async () => {
  let calls=0;
  const h=makeHarness({cachedTree:[{bn_name:"রংপুর",districts:[{bn_name:"ঠাকুরগাঁও",upazilas:"invalid"}]}],
    fetchImpl:async()=>{calls++;return {ok:true,json:async()=>tree};}});
  await ready(h);
  assert.equal(calls,1);
  assert.ok(h.elements.branchDivision.options.some(o=>o.value==="রংপুর"));
  assert.ok(h.elements.farmerDivision.options.some(o=>o.value==="ঢাকা"));
  assert.ok(JSON.parse(h.store.get("muhaimin_bd_address_tree_v1")).every(x=>Array.isArray(x.districts)));
});

test("rejects malformed nested downloaded hierarchy and does not cache it", async () => {
  const malformed=[{bn_name:"রংপুর",districts:[{bn_name:"ঠাকুরগাঁও",upazilas:[{bn_name:"সদর",unions:"invalid"}]}]}];
  const h=makeHarness({cachedTree:null,fetchImpl:async()=>({ok:true,json:async()=>malformed})});
  await ready(h);
  assert.match(h.elements.branchAddressStatus.textContent,/ফরম্যাট সঠিক নয়/);
  assert.equal(h.store.has("muhaimin_bd_address_tree_v1"),false);
});
