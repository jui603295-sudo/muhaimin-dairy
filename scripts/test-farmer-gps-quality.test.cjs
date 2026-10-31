"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const marker = "// Farmer GPS: explicit tap, validated fix, race protection, and no background tracking.";
const start = html.indexOf(marker);
const end = html.indexOf('bindForm("farmerForm"', start);
if (start < 0 || end < 0) throw new Error("Could not locate the actual Farmer GPS handler.");
const handlerSource = html.slice(start, end);

function makeHarness(geolocation) {
  const form = { elements: {
    latitude: { value: "" }, longitude: { value: "" },
    location_accuracy: { value: "" }, location_captured_at: { value: "" }
  }};
  const elements = {
    farmerForm: form,
    farmerLocationStatus: { textContent: "" },
    captureFarmerLocation: { disabled: false, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; } }
  };
  const $ = id => elements[id];
  vm.runInNewContext(handlerSource, {
    $, navigator: { geolocation }, Date, Number, String, Math
  }, { timeout: 1000 });
  return { elements, click() { return elements.captureFarmerLocation.listeners.click(); } };
}
function fix({latitude=26.0337,longitude=88.4617,accuracy=12.4,timestamp=Date.now()}={}) {
  return {coords:{latitude,longitude,accuracy},timestamp};
}
function values(h) {
  const e=h.elements.farmerForm.elements;
  return [e.latitude.value,e.longitude.value,e.location_accuracy.value,e.location_captured_at.value];
}

test("captures a fresh valid Farmer GPS fix only after an explicit tap", () => {
  let success, options;
  const h=makeHarness({getCurrentPosition(ok,fail,opts){success=ok;options=opts;}});
  h.click();
  assert.equal(h.elements.captureFarmerLocation.disabled,true);
  assert.equal(options.enableHighAccuracy,true);
  assert.equal(options.maximumAge,0);
  success(fix());
  assert.equal(values(h)[0],"26.0337");
  assert.equal(values(h)[1],"88.4617");
  assert.equal(values(h)[2],"12");
  assert.ok(Number.isFinite(Date.parse(values(h)[3])));
  assert.equal(h.elements.captureFarmerLocation.disabled,false);
});

test("rejects accuracy worse than 150 metres and clears the form fields", () => {
  let success;
  const h=makeHarness({getCurrentPosition(ok){success=ok;}});
  h.click(); success(fix({accuracy:151}));
  assert.deepEqual(values(h),["","","",""]);
  assert.match(h.elements.farmerLocationStatus.textContent,/১৫০ মিটার/);
  assert.equal(h.elements.captureFarmerLocation.disabled,false);
});

test("rejects out-of-range coordinates and negative or non-finite accuracy", () => {
  for (const coords of [
    {latitude:91,longitude:88,accuracy:10},
    {latitude:26,longitude:181,accuracy:10},
    {latitude:26,longitude:88,accuracy:-1},
    {latitude:26,longitude:88,accuracy:Infinity}
  ]) {
    let success;
    const h=makeHarness({getCurrentPosition(ok){success=ok;}});
    h.click(); success(fix(coords));
    assert.deepEqual(values(h),["","","",""]);
  }
});

test("rejects stale, future and invalid GPS timestamps", () => {
  for (const timestamp of [Date.now()-11*60*1000,Date.now()+60*1000,NaN,0]) {
    let success;
    const h=makeHarness({getCurrentPosition(ok){success=ok;}});
    h.click(); success(fix({timestamp}));
    assert.deepEqual(values(h),["","","",""]);
  }
});

test("permission and provider errors clear GPS and unlock the capture button", () => {
  let fail;
  const h=makeHarness({getCurrentPosition(ok,onError){fail=onError;}});
  h.click(); fail({code:1});
  assert.deepEqual(values(h),["","","",""]);
  assert.match(h.elements.farmerLocationStatus.textContent,/অনুমতি/);
  assert.equal(h.elements.captureFarmerLocation.disabled,false);
});

test("ignores a late callback from an earlier request", () => {
  const callbacks=[];
  const h=makeHarness({getCurrentPosition(ok,fail){callbacks.push({ok,fail});}});
  h.click(); h.click();
  callbacks[0].ok(fix({latitude:10}));
  assert.deepEqual(values(h),["","","",""]);
  callbacks[1].ok(fix({latitude:26}));
  assert.equal(values(h)[0],"26");
});

test("submit-time validator rejects stale or inaccurate GPS and allows no-GPS records", () => {
  const match=html.match(/function validateFreshFarmerLocation\(form\)\{[\s\S]*?\n\}/);
  assert.ok(match,"submit-time GPS validator is missing");
  const validate=vm.runInNewContext("("+match[0].replace(/^function /,"function ")+")", {Date,Number,String});
  validate({latitude:"",longitude:"",location_accuracy:"",location_captured_at:""});
  const fresh={latitude:"26",longitude:"88",location_accuracy:"20",location_captured_at:new Date().toISOString()};
  validate(fresh);
  validate({latitude:"26",longitude:"88",location_accuracy:"",location_captured_at:""},{latitude:26,longitude:88}); // unchanged legacy GPS remains editable
  assert.throws(()=>validate({...fresh,location_captured_at:new Date(Date.now()-11*60*1000).toISOString()}),/GPS/);
  assert.throws(()=>validate({...fresh,location_accuracy:"151"}),/GPS/);
  assert.throws(()=>validate({...fresh,location_captured_at:new Date(Date.now()+60*1000).toISOString()}),/GPS/);
});
