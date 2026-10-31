"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("function optionalLocationNumber");
const end = html.indexOf("function render()", start);
if (start < 0 || end < 0) throw new Error("Record payload helpers were not found in index.html");
let photoInput = { dataset: {} };
const context = {
  Number, String, Date,
  n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; },
  $(id) { return id === "farmerPhoto" ? photoInput : null; },
  esc(value) { return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]); }
};
vm.runInNewContext(html.slice(start, end), context, { timeout: 1000 });
const branchPayloadFromForm = vm.runInNewContext("branchPayloadFromForm", context);
const farmerPayloadFromForm = vm.runInNewContext("farmerPayloadFromForm", context);

test("Branch edit payload retains address, status, target, notes and GPS fields", () => {
  const payload = branchPayloadFromForm({
    code: "B006", name: "ঠাকুরগাঁও সদর", target_liters: "500", status: "Active",
    notes: "সকাল সংগ্রহ কেন্দ্র", branch_country: "বাংলাদেশ", branch_division: "রংপুর",
    branch_district: "ঠাকুরগাঁও", branch_upazila: "ঠাকুরগাঁও সদর", branch_union_name: "আকচা",
    branch_village_name: "আকচা বাজার", branch_latitude: "26.0337", branch_longitude: "88.4617",
    branch_location_accuracy_m: "12", branch_location_captured_at: "2026-10-31T02:00:00.000Z"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    code: "B006", name: "ঠাকুরগাঁও সদর", target_liters: 500, status: "Active",
    notes: "সকাল সংগ্রহ কেন্দ্র", country: "বাংলাদেশ", division: "রংপুর",
    district: "ঠাকুরগাঁও", upazila: "ঠাকুরগাঁও সদর", union_name: "আকচা",
    village_name: "আকচা বাজার", latitude: 26.0337, longitude: 88.4617,
    location_accuracy_m: 12, location_captured_at: "2026-10-31T02:00:00.000Z"
  });
});

test("Farmer edit payload retains existing photo when no replacement is selected", () => {
  photoInput = { dataset: {} };
  const payload = farmerPayloadFromForm({
    farmer_code: "F00001", name: "পরীক্ষা কৃষক", mobile: "01700000000", village: "পুরোনো ঠিকানা",
    farmer_country: "বাংলাদেশ", farmer_division: "রংপুর", farmer_district: "ঠাকুরগাঁও",
    farmer_upazila: "ঠাকুরগাঁও সদর", farmer_union_name: "আকচা", farmer_village_name: "আকচা",
    branch_id: "branch-1", expected_liters: "25", latitude: "26.0337", longitude: "88.4617",
    location_accuracy: "9", location_captured_at: "2026-10-31T02:01:00.000Z"
  }, { photo_data_url: "data:image/jpeg;base64,EXISTING" });
  assert.equal(payload.photo_data_url, "data:image/jpeg;base64,EXISTING");
  assert.equal(payload.branch_id, "branch-1");
  assert.equal(payload.location_accuracy, 9);
  assert.equal(payload.location_captured_at, "2026-10-31T02:01:00.000Z");
});

test("Farmer edit payload uses a newly compressed photo when supplied", () => {
  photoInput = { dataset: { compressedDataUrl: "data:image/jpeg;base64,NEW" } };
  const payload = farmerPayloadFromForm({
    farmer_code: "F00001", name: "পরীক্ষা কৃষক", mobile: "01700000000",
    farmer_country: "বাংলাদেশ", branch_id: "branch-1", expected_liters: "0",
    latitude: "", longitude: "", location_accuracy: "", location_captured_at: ""
  }, { photo_data_url: "data:image/jpeg;base64,OLD" });
  assert.equal(payload.photo_data_url, "data:image/jpeg;base64,NEW");
  assert.equal(payload.expected_liters, 0);
});

test("Farmer edit without any old or new photo remains null", () => {
  photoInput = { dataset: {} };
  const payload = farmerPayloadFromForm({
    farmer_code: "F00002", name: "নতুন কৃষক", mobile: "01700000001",
    branch_id: "branch-1", expected_liters: ""
  }, null);
  assert.equal(payload.photo_data_url, null);
});

test("Both edit forms call update by record id and require a returned row", () => {
  assert.match(html, /sb\.from\(tableName\)\.update\(data\)\.eq\("id",id\)\.select\("id"\)\.maybeSingle\(\)/);
  assert.match(html, /if\(!result\.data\?\.id\)throw new Error/);
  assert.match(html, /id\?updateRow\("branches",id,payload,form\):insertRow\("branches",payload,form\)/);
  assert.match(html, /id\?updateRow\("farmers",id,payload,form\):insertRow\("farmers",payload,form\)/);
});

test("Edit actions are present for both Branch and Farmer lists", () => {
  assert.match(html, /data-record-action="edit-branch"/);
  assert.match(html, /data-record-action="edit-farmer"/);
  assert.match(html, /editBranchRecord\(button\.dataset\.recordId\)/);
  assert.match(html, /editFarmerRecord\(button\.dataset\.recordId\)/);
});

test("Address hierarchy restoration is sequenced through the existing cascade", () => {
  assert.match(html, /await addressCascadeReady\[prefix\]/);
  assert.match(html, /division\.dispatchEvent\(new Event\("change"\)\)/);
  assert.match(html, /district\.dispatchEvent\(new Event\("change"\)\)/);
  assert.match(html, /upazila\.dispatchEvent\(new Event\("change"\)\)/);
  assert.match(html, /union\.value=v\.union_name\|\|""/);
});

test("Cancel controls clear edit mode without issuing a database delete", () => {
  assert.match(html, /cancelBranchEdit/);
  assert.match(html, /cancelFarmerEdit/);
  assert.match(html, /clearEditState\("branch"\)/);
  assert.match(html, /clearEditState\("farmer"\)/);
  assert.doesNotMatch(html, /\.from\(["'](?:branches|farmers)["']\)\.delete\(/);
});
