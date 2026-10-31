"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const marker = "// Branch GPS: capture only after an explicit tap; no background tracking.";
const start = html.indexOf(marker);
const end = html.indexOf('bindForm("branchForm"', start);
if (start < 0 || end < 0) throw new Error("Could not locate the actual Branch GPS handler in index.html");
const handlerSource = html.slice(start, end);

function setup(geolocation) {
  const elements = Object.fromEntries([
    "branchLocationStatus", "captureBranchLocation", "clearBranchLocation",
    "branchLatitude", "branchLongitude", "branchLocationAccuracy", "branchLocationCapturedAt"
  ].map(id => [id, { value: "", textContent: "", disabled: false, listeners: {} }]));
  const $ = id => elements[id];
  vm.runInNewContext(handlerSource, {
    $, navigator: { geolocation }, Date, Number, String, Math
  }, { timeout: 1000 });
  return {
    elements,
    click(id) {
      const fn = elements[id].listeners.click;
      assert.equal(typeof fn, "function", id + " click handler is missing");
      return fn();
    },
    registerClickHandlers() {
      // The mock records handlers through the same addEventListener calls as the browser.
    }
  };
}

// Install addEventListener on every mock element before evaluating the real handler.
function makeHarness(geolocation) {
  const elements = Object.fromEntries([
    "branchLocationStatus", "captureBranchLocation", "clearBranchLocation",
    "branchLatitude", "branchLongitude", "branchLocationAccuracy", "branchLocationCapturedAt"
  ].map(id => [id, { value: "", textContent: "", disabled: false, listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; } }]));
  const $ = id => elements[id];
  vm.runInNewContext(handlerSource, {
    $, navigator: { geolocation }, Date, Number, String, Math
  }, { timeout: 1000 });
  return { elements, click(id) { return elements[id].listeners.click(); } };
}

function fix(latitude = 26.0337, longitude = 88.4617, accuracy = 12.4, timestamp = 1793400000000) {
  return { coords: { latitude, longitude, accuracy }, timestamp };
}

test("captures valid coordinates, accuracy and timestamp only after a tap", () => {
  let success;
  let options;
  const h = makeHarness({ getCurrentPosition(ok, fail, opts) { success = ok; options = opts; } });
  h.click("captureBranchLocation");
  assert.equal(h.elements.captureBranchLocation.disabled, true);
  assert.match(h.elements.branchLocationStatus.textContent, /লোকেশন নেওয়া হচ্ছে/);
  assert.deepEqual(options, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  success(fix());
  assert.equal(h.elements.branchLatitude.value, "26.0337");
  assert.equal(h.elements.branchLongitude.value, "88.4617");
  assert.equal(h.elements.branchLocationAccuracy.value, "12");
  assert.equal(h.elements.branchLocationCapturedAt.value, new Date(1793400000000).toISOString());
  assert.equal(h.elements.captureBranchLocation.disabled, false);
  assert.match(h.elements.branchLocationStatus.textContent, /লোকেশন নেওয়া হয়েছে/);
});

test("reports unsupported GPS without pretending to capture a location", () => {
  const h = makeHarness(undefined);
  h.click("captureBranchLocation");
  assert.match(h.elements.branchLocationStatus.textContent, /GPS সমর্থিত নয়/);
  assert.equal(h.elements.branchLatitude.value, "");
});

test("permission denial clears invalid/stale location fields and restores the button", () => {
  let failure;
  const h = makeHarness({ getCurrentPosition(ok, fail) { failure = fail; } });
  h.elements.branchLatitude.value = "26";
  h.elements.branchLongitude.value = "88";
  h.click("captureBranchLocation");
  failure({ code: 1 });
  assert.equal(h.elements.branchLatitude.value, "");
  assert.equal(h.elements.branchLongitude.value, "");
  assert.match(h.elements.branchLocationStatus.textContent, /অনুমতি দেওয়া হয়নি/);
  assert.equal(h.elements.captureBranchLocation.disabled, false);
});

test("rejects out-of-range coordinates and invalid accuracy", () => {
  for (const badFix of [fix(91, 88, 5), fix(26, 181, 5), fix(26, 88, -1), fix(NaN, 88, 5)]) {
    let success;
    const h = makeHarness({ getCurrentPosition(ok) { success = ok; } });
    h.click("captureBranchLocation");
    success(badFix);
    assert.equal(h.elements.branchLatitude.value, "");
    assert.equal(h.elements.branchLongitude.value, "");
    assert.match(h.elements.branchLocationStatus.textContent, /GPS তথ্য সঠিক নয়/);
    assert.equal(h.elements.captureBranchLocation.disabled, false);
  }
});

test("clear action invalidates an in-flight GPS callback", () => {
  let success;
  const h = makeHarness({ getCurrentPosition(ok) { success = ok; } });
  h.click("captureBranchLocation");
  h.click("clearBranchLocation");
  success(fix());
  assert.equal(h.elements.branchLatitude.value, "");
  assert.equal(h.elements.branchLongitude.value, "");
  assert.equal(h.elements.branchLocationAccuracy.value, "");
  assert.equal(h.elements.branchLocationCapturedAt.value, "");
  assert.equal(h.elements.captureBranchLocation.disabled, false);
  assert.match(h.elements.branchLocationStatus.textContent, /মুছে দেওয়া হয়েছে/);
});

test("a late result from an older request cannot overwrite the newest GPS fix", () => {
  const callbacks = [];
  const h = makeHarness({ getCurrentPosition(ok, fail) { callbacks.push({ ok, fail }); } });
  h.click("captureBranchLocation");
  h.click("captureBranchLocation");
  callbacks[1].ok(fix(25.1, 89.2, 8, 1793400001000));
  callbacks[0].ok(fix(26.9, 87.3, 40, 1793400000000));
  assert.equal(h.elements.branchLatitude.value, "25.1");
  assert.equal(h.elements.branchLongitude.value, "89.2");
  assert.equal(h.elements.branchLocationAccuracy.value, "8");
  assert.equal(h.elements.captureBranchLocation.disabled, false);
});

test("handles geolocation API exceptions without leaving the button disabled", () => {
  const h = makeHarness({ getCurrentPosition() { throw new Error("browser API failure"); } });
  h.click("captureBranchLocation");
  assert.equal(h.elements.captureBranchLocation.disabled, false);
  assert.match(h.elements.branchLocationStatus.textContent, /সমস্যা হয়েছে/);
});
