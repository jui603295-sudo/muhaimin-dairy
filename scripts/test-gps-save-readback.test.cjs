"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const helperStart = html.indexOf("function optionalLocationNumber");
const helperEnd = html.indexOf("function render()", helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error("GPS persistence helpers were not found in index.html");
const helperSource = html.slice(helperStart, helperEnd);
const context = {
  Number, String, Date,
  esc(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
};
vm.runInNewContext(helperSource, context, { timeout: 1000 });
const locationPayloadFromForm = vm.runInNewContext("locationPayloadFromForm", context);
const locationSummary = vm.runInNewContext("locationSummary", context);

test("Branch form maps GPS fields to the existing branches schema", () => {
  const payload = locationPayloadFromForm({
    branch_latitude: "26.0337",
    branch_longitude: "88.4617",
    branch_location_accuracy_m: "12",
    branch_location_captured_at: "2026-10-31T02:00:00.000Z"
  }, {
    latitude: "branch_latitude", longitude: "branch_longitude",
    accuracy: "branch_location_accuracy_m", capturedAt: "branch_location_captured_at",
    accuracyColumn: "location_accuracy_m"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    latitude: 26.0337, longitude: 88.4617, location_accuracy_m: 12,
    location_captured_at: "2026-10-31T02:00:00.000Z"
  });
});

test("Farmer form maps GPS fields to the existing farmers schema", () => {
  const payload = locationPayloadFromForm({
    latitude: "26.0337", longitude: "88.4617", location_accuracy: "9",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, {
    latitude: "latitude", longitude: "longitude", accuracy: "location_accuracy",
    capturedAt: "location_captured_at", accuracyColumn: "location_accuracy"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    latitude: 26.0337, longitude: 88.4617, location_accuracy: 9,
    location_captured_at: "2026-10-31T02:01:00.000Z"
  });
});

test("zero-valued coordinates are retained rather than treated as missing", () => {
  const payload = locationPayloadFromForm({
    latitude: "0", longitude: "0", location_accuracy: "0",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, {
    latitude: "latitude", longitude: "longitude", accuracy: "location_accuracy",
    capturedAt: "location_captured_at", accuracyColumn: "location_accuracy"
  });
  assert.equal(payload.latitude, 0);
  assert.equal(payload.longitude, 0);
  assert.equal(payload.location_accuracy, 0);
});

test("an intentionally empty GPS form stores null metadata", () => {
  const payload = locationPayloadFromForm({
    branch_latitude: "", branch_longitude: "", branch_location_accuracy_m: "",
    branch_location_captured_at: ""
  }, {
    latitude: "branch_latitude", longitude: "branch_longitude",
    accuracy: "branch_location_accuracy_m", capturedAt: "branch_location_captured_at",
    accuracyColumn: "location_accuracy_m"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    latitude: null, longitude: null, location_accuracy_m: null, location_captured_at: null
  });
});

test("rejects a partial coordinate pair", () => {
  assert.throws(() => locationPayloadFromForm({
    latitude: "26.03", longitude: "", location_accuracy: "10",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, {
    latitude: "latitude", longitude: "longitude", accuracy: "location_accuracy",
    capturedAt: "location_captured_at", accuracyColumn: "location_accuracy"
  }), /অক্ষাংশ ও দ্রাঘিমাংশ/);
});

test("rejects out-of-range coordinates and negative accuracy", () => {
  const fields = {
    latitude: "latitude", longitude: "longitude", accuracy: "location_accuracy",
    capturedAt: "location_captured_at", accuracyColumn: "location_accuracy"
  };
  assert.throws(() => locationPayloadFromForm({
    latitude: "91", longitude: "88", location_accuracy: "10",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, fields), /অক্ষাংশ তথ্য সঠিক নয়/);
  assert.throws(() => locationPayloadFromForm({
    latitude: "26", longitude: "88", location_accuracy: "-1",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, fields), /GPS নির্ভুলতা তথ্য সঠিক নয়/);
});

test("requires accuracy and a valid capture timestamp whenever coordinates exist", () => {
  const fields = {
    latitude: "latitude", longitude: "longitude", accuracy: "location_accuracy",
    capturedAt: "location_captured_at", accuracyColumn: "location_accuracy"
  };
  assert.throws(() => locationPayloadFromForm({
    latitude: "26", longitude: "88", location_accuracy: "",
    location_captured_at: "2026-10-31T02:01:00.000Z"
  }, fields), /নির্ভুলতা ও নেওয়ার সময় আবশ্যক/);
  assert.throws(() => locationPayloadFromForm({
    latitude: "26", longitude: "88", location_accuracy: "10",
    location_captured_at: "not-a-date"
  }, fields), /সময় সঠিক নয়/);
});

test("readback summary renders persisted coordinates, accuracy and capture time", () => {
  const summary = locationSummary({
    latitude: 26.0337, longitude: 88.4617, location_accuracy_m: 12,
    location_captured_at: "2026-10-31T02:00:00.000Z"
  }, "location_accuracy_m");
  assert.match(summary, /26\.0337, 88\.4617/);
  assert.match(summary, /12/);
  assert.match(summary, /2026-10-31T02:00:00\.000Z/);
});

test("readback summary clearly labels records without a GPS fix", () => {
  assert.match(locationSummary({ latitude: null, longitude: null }, "location_accuracy"), /লোকেশন নেই/);
});

test("both forms use the validated GPS payload and loaded records feed the visible GPS columns", () => {
  assert.match(html, /\.\.\.locationPayloadFromForm\(f,\{latitude:"branch_latitude"/);
  assert.match(html, /\.\.\.locationPayloadFromForm\(f,\{latitude:"latitude"/);
  assert.match(html, /let query=sb\.from\(tableName\)\.select\("\*"\)/);
  assert.match(html, /locationSummary\(b,"location_accuracy_m"\)/);
  assert.match(html, /locationSummary\(f,"location_accuracy"\)/);
});
