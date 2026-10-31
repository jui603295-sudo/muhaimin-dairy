const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("async function insertRow");
const end = html.indexOf("function bindForm", start);
assert.ok(start >= 0 && end > start, "actual insertRow implementation must exist");
const source = html.slice(start, end) + "\nglobalThis.__insertRow = insertRow;";

function harness(result) {
  let resetCount = 0;
  let activityCount = 0;
  let toastCount = 0;
  let loadCount = 0;
  const photoInput = {
    value: "farmer-photo.jpg",
    dataset: { compressedDataUrl: "data:image/jpeg;base64,ZmFrZQ==" }
  };
  const photoPreview = {
    src: "data:image/jpeg;base64,ZmFrZQ==",
    classNames: new Set(),
    removeAttribute(name) { if (name === "src") this.src = ""; },
    classList: { add: name => photoPreview.classNames.add(name) }
  };
  const farmerName = { value: "পরীক্ষামূলক কৃষক" };
  const farmerMobile = { value: "01700000000" };
  const form = {
    elements: { farmer_name: farmerName, farmer_mobile: farmerMobile },
    reset() {
      resetCount++;
      farmerName.value = "";
      farmerMobile.value = "";
    }
  };
  const context = {
    sb: { from(table) { return { insert: async payload => { if (result.reject) throw result.reject; return { ...result, table, payload }; } }; } },
    lang: () => "bn",
    $: id => id === "farmerPhoto" ? photoInput : id === "farmerPhotoPreview" ? photoPreview : null,
    logActivity: () => { activityCount++; },
    toast: () => { toastCount++; },
    loadAll: async () => { loadCount++; }
  };
  vm.runInNewContext(source, context, { filename: "actual-insert-row.js" });
  return {
    insert: (table, payload) => context.__insertRow(table, payload, form),
    form, farmerName, farmerMobile, photoInput, photoPreview,
    counts: () => ({ resetCount, activityCount, toastCount, loadCount })
  };
}

test("failed Farmer insert preserves form values and compressed photo state", async () => {
  const h = harness({ error: { code: "42501", message: "row-level security policy denied" } });
  await assert.rejects(
    h.insert("farmers", { name: "পরীক্ষামূলক কৃষক" }),
    error => error && error.message === "row-level security policy denied"
  );
  assert.deepEqual(h.counts(), { resetCount: 0, activityCount: 0, toastCount: 0, loadCount: 0 });
  assert.equal(h.farmerName.value, "পরীক্ষামূলক কৃষক");
  assert.equal(h.farmerMobile.value, "01700000000");
  assert.equal(h.photoInput.value, "farmer-photo.jpg");
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.src, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.classNames.has("hidden"), false);
});

test("successful Farmer insert resets the form and clears photo state exactly after success", async () => {
  const h = harness({ error: null, data: [{ id: "farmer-1" }] });
  await h.insert("farmers", { name: "পরীক্ষামূলক কৃষক" });
  assert.deepEqual(h.counts(), { resetCount: 1, activityCount: 1, toastCount: 1, loadCount: 1 });
  assert.equal(h.farmerName.value, "");
  assert.equal(h.farmerMobile.value, "");
  assert.equal(h.photoInput.value, "");
  assert.equal(Object.hasOwn(h.photoInput.dataset, "compressedDataUrl"), false);
  assert.equal(h.photoPreview.src, "");
  assert.equal(h.photoPreview.classNames.has("hidden"), true);
});

test("failed non-Farmer insert also avoids success-only reset and side effects", async () => {
  const h = harness({ error: { code: "42501", message: "permission denied" } });
  await assert.rejects(h.insert("branches", { name: "পরীক্ষা কেন্দ্র" }), error => error && error.message === "permission denied");
  assert.deepEqual(h.counts(), { resetCount: 0, activityCount: 0, toastCount: 0, loadCount: 0 });
});


test("duplicate Farmer code conflict shows a safe validation error and preserves form/photo state", async () => {
  const h = harness({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
  await assert.rejects(
    h.insert("farmers", { name: "পরীক্ষামূলক কৃষক", farmer_code: "F00001" }),
    error => error && error.message.includes("ইউনিক নিয়মের সঙ্গে সংঘর্ষ")
  );
  assert.deepEqual(h.counts(), { resetCount: 0, activityCount: 0, toastCount: 0, loadCount: 0 });
  assert.equal(h.farmerName.value, "পরীক্ষামূলক কৃষক");
  assert.equal(h.farmerMobile.value, "01700000000");
  assert.equal(h.photoInput.value, "farmer-photo.jpg");
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.src, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.classNames.has("hidden"), false);
});


test("missing registered_at timestamp-column schema error gives a clear recovery message and preserves Farmer form/photo state", async () => {
  const h = harness({ error: { code: "PGRST204", message: "column registered_at does not exist in schema cache" } });
  await assert.rejects(
    h.insert("farmers", { name: "পরীক্ষামূলক কৃষক", registered_at: "2026-10-31T01:00:00.000Z" }),
    error => error && error.message.includes("তারিখ/সময়ের প্রয়োজনীয় কলাম খুঁজে পাওয়া যায়নি")
  );
  assert.deepEqual(h.counts(), { resetCount: 0, activityCount: 0, toastCount: 0, loadCount: 0 });
  assert.equal(h.farmerName.value, "পরীক্ষামূলক কৃষক");
  assert.equal(h.farmerMobile.value, "01700000000");
  assert.equal(h.photoInput.value, "farmer-photo.jpg");
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.src, "data:image/jpeg;base64,ZmFrZQ==");
});

test("network rejection preserves Farmer form and photo state without success side effects", async () => {
  const h = harness({ reject: new Error("network unavailable") });
  await assert.rejects(
    h.insert("farmers", { name: "পরীক্ষামূলক কৃষক" }),
    error => error && error.message === "network unavailable"
  );
  assert.deepEqual(h.counts(), { resetCount: 0, activityCount: 0, toastCount: 0, loadCount: 0 });
  assert.equal(h.farmerName.value, "পরীক্ষামূলক কৃষক");
  assert.equal(h.farmerMobile.value, "01700000000");
  assert.equal(h.photoInput.value, "farmer-photo.jpg");
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(h.photoPreview.src, "data:image/jpeg;base64,ZmFrZQ==");
});


function bindFormHarness() {
  const toasts = [];
  let registeredAtCalls = 0;
  let handlerCalls = 0;
  let submittedPayload = null;
  let submittedForm = null;
  let listener = null;
  const form = {
    addEventListener(type, callback) {
      assert.equal(type, "submit");
      listener = callback;
    }
  };
  const context = {
    $(id) { return id === "farmerForm" ? form : null; },
    formObj(actualForm) {
      assert.equal(actualForm, form);
      return { name: "পরীক্ষামূলক কৃষক", mobile: "01700000000" };
    },
    setFarmerRegistrationTime() { registeredAtCalls++; },
    toast(message) { toasts.push(String(message)); }
  };
  const start = html.indexOf("function bindForm");
  const end = html.indexOf('$("language").value=lang();', start);
  assert.ok(start >= 0 && end > start, "actual bindForm implementation must exist");
  const source = html.slice(start, end) + "\nglobalThis.__bindForm = bindForm;";
  vm.runInNewContext(source, context, { filename: "actual-bind-form.js" });
  return {
    bind(handler) {
      context.__bindForm("farmerForm", async (payload, actualForm) => {
        handlerCalls++;
        submittedPayload = payload;
        submittedForm = actualForm;
        return handler(payload, actualForm);
      });
    },
    async submit() {
      assert.equal(typeof listener, "function", "submit listener must be registered");
      let prevented = false;
      await listener({ preventDefault() { prevented = true; } });
      return { prevented };
    },
    toasts,
    counts: () => ({ registeredAtCalls, handlerCalls }),
    form,
    submitted: () => ({ payload: submittedPayload, form: submittedForm })
  };
}

test("Farmer bindForm displays Bengali insert errors and keeps submit state intact", async () => {
  const h = bindFormHarness();
  h.bind(async () => {
    throw new Error("এই কৃষক রেকর্ডটি ডেটাবেসের বিদ্যমান ইউনিক নিয়মের সঙ্গে সংঘর্ষ করেছে।");
  });
  const result = await h.submit();
  assert.equal(result.prevented, true);
  assert.deepEqual(h.toasts, ["এই কৃষক রেকর্ডটি ডেটাবেসের বিদ্যমান ইউনিক নিয়মের সঙ্গে সংঘর্ষ করেছে।"]);
  assert.deepEqual(h.counts(), { registeredAtCalls: 1, handlerCalls: 1 });
  assert.equal(h.submitted().form, h.form);
  assert.equal(h.submitted().payload.name, "পরীক্ষামূলক কৃষক");
});

test("Farmer bindForm surfaces schema-cache recovery guidance without swallowing the submit error silently", async () => {
  const h = bindFormHarness();
  h.bind(async () => {
    throw new Error("Supabase-এ তারিখ/সময়ের প্রয়োজনীয় কলাম খুঁজে পাওয়া যায়নি।");
  });
  await h.submit();
  assert.equal(h.toasts.length, 1);
  assert.match(h.toasts[0], /তারিখ\/সময়ের প্রয়োজনীয় কলাম/);
  assert.deepEqual(h.counts(), { registeredAtCalls: 1, handlerCalls: 1 });
});

test("successful Farmer bindForm submission does not show an error toast", async () => {
  const h = bindFormHarness();
  h.bind(async () => ({ saved: true }));
  const result = await h.submit();
  assert.equal(result.prevented, true);
  assert.deepEqual(h.toasts, []);
  assert.deepEqual(h.counts(), { registeredAtCalls: 1, handlerCalls: 1 });
});


// Exercise the actual Farmer list rendering helpers from index.html.
function farmerRenderingHarness() {
  const start = html.indexOf("  const farmerPhotoCell=");
  const end = html.indexOf('  $("farmerTable").innerHTML=', start);
  assert.ok(start >= 0 && end > start, "actual Farmer rendering helpers must exist");
  const source = html.slice(start, end) + "\nglobalThis.__farmerPhotoCell = farmerPhotoCell; globalThis.__farmerGpsLabel = farmerGpsLabel; globalThis.__farmerRegisteredLabel = farmerRegisteredLabel; globalThis.__farmerAddressLabel = farmerAddressLabel;";
  const context = {
    esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[char]);
    }
  };
  vm.runInNewContext(source, context, { filename: "actual-farmer-render-helpers.js" });
  return context;
}

test("Farmer list renders a valid compressed JPEG data URL as a photo", () => {
  const h = farmerRenderingHarness();
  const photo = "data:image/jpeg;base64,QUJDRA==";
  const htmlCell = h.__farmerPhotoCell({ photo_data_url: photo });
  assert.match(htmlCell, /<img /);
  assert.ok(htmlCell.includes(photo));
});

test("Farmer list rejects oversized, malformed, and SVG photo data", () => {
  const h = farmerRenderingHarness();
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64," + "A".repeat(650001) }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/svg+xml;base64,PHN2Zz4=" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "javascript:alert(1)" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64,not valid!" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64,A===" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64,AAAAA" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64,QUJDRA=" }), "—");
  assert.equal(h.__farmerPhotoCell({ photo_data_url: "data:image/jpeg;base64,QUJD RA==" }), "—");
});

test("Farmer list shows GPS only when both coordinates exist and escapes accuracy text", () => {
  const h = farmerRenderingHarness();
  assert.equal(h.__farmerGpsLabel({ latitude: 26.03, longitude: 88.46, location_accuracy: 12 }), "সংরক্ষিত • ±12m");
  assert.equal(h.__farmerGpsLabel({ latitude: 26.03, longitude: null }), "নেই");
  assert.equal(h.__farmerGpsLabel({ latitude: null, longitude: 88.46 }), "নেই");
  assert.equal(h.__farmerGpsLabel({ latitude: 26.03, longitude: 88.46, location_accuracy: "<script>" }), "সংরক্ষিত • ±&lt;script&gt;m");
});

test("Farmer list uses registered_at first and created_at as legacy fallback", () => {
  const h = farmerRenderingHarness();
  const registered = h.__farmerRegisteredLabel({ registered_at: "2026-10-31T01:00:00.000Z", created_at: "2020-01-01T00:00:00.000Z" });
  assert.equal(registered, "31/10/2026, 07:00");
  assert.equal(h.__farmerRegisteredLabel({ created_at: "2020-01-01T00:00:00.000Z" }), "01/01/2020, 06:00");
  assert.equal(h.__farmerRegisteredLabel({}), "পুরোনো রেকর্ড");
  assert.equal(h.__farmerRegisteredLabel({ registered_at: "not-a-date" }), "—");
});

test("Farmer list escapes address labels before inserting them into table markup", () => {
  const h = farmerRenderingHarness();
  assert.equal(
    h.__farmerAddressLabel({ division: "Rangpur", district: "<img src=x>", upazila: "Sadar", union_name: "Union", village_name: "Village" }),
    "Rangpur / &lt;img src=x&gt; / Sadar / Union / Village"
  );
});


// Run the actual Farmer photo and GPS event handlers with browser API fakes.
function farmerMediaHarness(options = {}) {
  const listeners = {};
  const toasts = [];
  const fields = Object.fromEntries(
    ["latitude", "longitude", "location_accuracy", "location_captured_at"].map(name => [name, { value: "" }])
  );
  const form = { elements: fields };
  const photoInput = { dataset: {}, value: "", files: [], addEventListener(type, callback) { listeners["photo:" + type] = callback; } };
  const preview = {
    src: "",
    classes: new Set(["hidden"]),
    removeAttribute(name) { if (name === "src") this.src = ""; },
    classList: {
      add: name => preview.classes.add(name),
      remove: name => preview.classes.delete(name)
    }
  };
  const status = { textContent: "", dataset: {} };
  const photoButton = { addEventListener(type, callback) { listeners["photo:" + type] = callback; } };
  const gpsButton = { addEventListener(type, callback) { listeners["gps:" + type] = callback; } };
  const canvas = {
    width: 0, height: 0,
    getContext() { return { drawImage() {} }; },
    toDataURL() { return options.dataUrl || "data:image/jpeg;base64,QUJDRA=="; }
  };
  const context = {
    $ (id) {
      return ({
        farmerPhoto: photoInput,
        farmerPhotoPreview: preview,
        captureFarmerLocation: gpsButton,
        farmerLocationStatus: status,
        farmerForm: form
      })[id] || null;
    },
    toast(message) { toasts.push(String(message)); },
    createImageBitmap: options.createImageBitmap || (async () => ({
      width: 1200, height: 800, close() { this.closed = true; }
    })),
    document: { createElement(tag) { assert.equal(tag, "canvas"); return canvas; } },
    navigator: options.navigator || { geolocation: {
      getCurrentPosition(success, failure, config) {
        context.__geoCallbacks = { success, failure, config };
        if (options.position) success(options.position);
        if (options.geoError) failure(options.geoError);
      }
    } },
    Date
  };
  const start = html.indexOf('$("farmerPhoto")?.addEventListener("change"');
  const end = html.indexOf('\n\nbindForm("branchForm"', start);
  assert.ok(start >= 0 && end > start, "actual Farmer photo and GPS handlers must exist");
  vm.runInNewContext(html.slice(start, end), context, { filename: "actual-farmer-media-handlers.js" });
  return {
    listeners, toasts, fields, form, photoInput, preview, status, canvas, context,
    async choosePhoto(file) {
      photoInput.files = file ? [file] : [];
      await listeners["photo:change"]({ currentTarget: photoInput });
    },
    captureGps() { listeners["gps:click"](); }
  };
}

test("Farmer photo handler compresses a supported image and retains preview data URL", async () => {
  const h = farmerMediaHarness();
  await h.choosePhoto({ type: "image/png", size: 1024 });
  assert.equal(h.canvas.width, 720);
  assert.equal(h.canvas.height, 480);
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,QUJDRA==");
  assert.equal(h.preview.src, "data:image/jpeg;base64,QUJDRA==");
  assert.equal(h.preview.classes.has("hidden"), false);
  assert.deepEqual(h.toasts, []);
});

test("Farmer photo handler rejects unsupported and oversized original files", async () => {
  const h = farmerMediaHarness();
  await h.choosePhoto({ type: "text/plain", size: 20 });
  assert.equal(h.photoInput.value, "");
  assert.equal(h.photoInput.dataset.compressedDataUrl, undefined);
  assert.match(h.toasts[0], /সমর্থিত ছবি নির্বাচন করুন/);
  const second = farmerMediaHarness();
  await second.choosePhoto({ type: "image/jpeg", size: 12 * 1024 * 1024 + 1 });
  assert.equal(second.photoInput.value, "");
  assert.equal(second.photoInput.dataset.compressedDataUrl, undefined);
  assert.match(second.toasts[0], /১২ MB-এর বেশি/);
});

test("Farmer photo handler accepts the largest valid base64 data URL within the database limit", async () => {
  const prefix = "data:image/jpeg;base64,";
  const largestValidDataUrl = prefix + "A".repeat(649976);
  const h = farmerMediaHarness({ dataUrl: largestValidDataUrl });
  await h.choosePhoto({ type: "image/jpeg", size: 2048 });
  assert.equal(h.photoInput.dataset.compressedDataUrl.length, 649999);
  assert.equal(h.preview.src.length, 649999);
  assert.equal(h.preview.classes.has("hidden"), false);
  assert.deepEqual(h.toasts, []);
});

test("Farmer photo handler clears file and preview if compression remains above the database limit", async () => {
  const h = farmerMediaHarness({ dataUrl: "data:image/jpeg;base64," + "A".repeat(650001) });
  await h.choosePhoto({ type: "image/jpeg", size: 2048 });
  assert.equal(h.photoInput.value, "");
  assert.equal(h.photoInput.dataset.compressedDataUrl, undefined);
  assert.equal(h.preview.src, "");
  assert.equal(h.preview.classes.has("hidden"), true);
  assert.match(h.toasts[0], /কমপ্রেস করার পরও ছবিটি বড়/);
});


test("Farmer photo handler ignores an older decode that finishes after a newer photo selection", async () => {
  let resolveFirst;
  const firstDecode = new Promise(resolve => { resolveFirst = resolve; });
  let calls = 0;
  const h = farmerMediaHarness({
    createImageBitmap: async () => {
      calls++;
      if (calls === 1) return firstDecode;
      return { width: 640, height: 480, close() { this.closed = true; } };
    },
    dataUrl: "data:image/jpeg;base64,TkVX"
  });
  const first = h.choosePhoto({ type: "image/jpeg", size: 1000, name: "old.jpg" });
  await Promise.resolve();
  const secondFile = { type: "image/png", size: 1000, name: "new.png" };
  await h.choosePhoto(secondFile);
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,TkVX");
  const staleBitmap = { width: 1200, height: 800, closed: false, close() { this.closed = true; } };
  resolveFirst(staleBitmap);
  await first;
  assert.equal(h.photoInput.dataset.compressedDataUrl, "data:image/jpeg;base64,TkVX");
  assert.equal(h.preview.src, "data:image/jpeg;base64,TkVX");
  assert.equal(staleBitmap.closed, true);
  assert.deepEqual(h.toasts, []);
});

test("Farmer photo handler does not restore a photo after the user clears the file while decoding", async () => {
  let resolveDecode;
  const pending = new Promise(resolve => { resolveDecode = resolve; });
  const h = farmerMediaHarness({ createImageBitmap: async () => pending });
  const first = h.choosePhoto({ type: "image/jpeg", size: 1000, name: "pending.jpg" });
  await Promise.resolve();
  await h.choosePhoto(null);
  resolveDecode({ width: 800, height: 600, close() { this.closed = true; } });
  await first;
  assert.equal(h.photoInput.dataset.compressedDataUrl, undefined);
  assert.equal(h.preview.src, "");
  assert.equal(h.preview.classes.has("hidden"), true);
  assert.deepEqual(h.toasts, []);
});

test("Farmer photo handler fails safely when image decoding is unavailable", async () => {
  const h = farmerMediaHarness({ createImageBitmap: async () => { throw new Error("decode failed"); } });
  await h.choosePhoto({ type: "image/jpeg", size: 1024 });
  assert.equal(h.photoInput.dataset.compressedDataUrl, undefined);
  assert.equal(h.preview.src, "");
  assert.equal(h.preview.classes.has("hidden"), true);
  assert.equal(h.photoInput.value, "");
  assert.deepEqual(h.toasts, ["decode failed"]);
});


test("Farmer GPS handler ignores an older location result after a newer request", () => {
  const requests = [];
  const h = farmerMediaHarness({ navigator: { geolocation: {
    getCurrentPosition(success, failure, config) { requests.push({ success, failure, config }); }
  } } });
  h.captureGps();
  h.captureGps();
  const newer = { coords: { latitude: 26.04, longitude: 88.47, accuracy: 8 }, timestamp: Date.parse("2026-10-31T02:00:00.000Z") };
  requests[1].success(newer);
  requests[0].success({ coords: { latitude: 26.03, longitude: 88.46, accuracy: 30 }, timestamp: Date.parse("2026-10-31T01:00:00.000Z") });
  assert.equal(h.fields.latitude.value, "26.04");
  assert.equal(h.fields.longitude.value, "88.47");
  assert.equal(h.fields.location_accuracy.value, "8");
  assert.equal(h.fields.location_captured_at.value, "2026-10-31T02:00:00.000Z");
  assert.match(h.status.textContent, /লোকেশন নেওয়া হয়েছে/);
});

test("Farmer GPS handler ignores a stale permission error after a newer request succeeds", () => {
  const requests = [];
  const h = farmerMediaHarness({ navigator: { geolocation: {
    getCurrentPosition(success, failure, config) { requests.push({ success, failure, config }); }
  } } });
  h.captureGps();
  h.captureGps();
  requests[1].success({ coords: { latitude: 26.05, longitude: 88.48, accuracy: 9 }, timestamp: Date.parse("2026-10-31T03:00:00.000Z") });
  requests[0].failure({ code: 1 });
  assert.equal(h.fields.latitude.value, "26.05");
  assert.equal(h.fields.longitude.value, "88.48");
  assert.match(h.status.textContent, /লোকেশন নেওয়া হয়েছে/);
});

test("Farmer GPS handler saves valid coordinates and capture timestamp", () => {
  const position = {
    coords: { latitude: 26.03, longitude: 88.46, accuracy: 12.4 },
    timestamp: Date.parse("2026-10-31T01:00:00.000Z")
  };
  const h = farmerMediaHarness({ position });
  h.fields.latitude.value = "old";
  h.captureGps();
  assert.equal(h.fields.latitude.value, "26.03");
  assert.equal(h.fields.longitude.value, "88.46");
  assert.equal(h.fields.location_accuracy.value, "12");
  assert.equal(h.fields.location_captured_at.value, "2026-10-31T01:00:00.000Z");
  assert.match(h.status.textContent, /লোকেশন নেওয়া হয়েছে/);
  assert.equal(h.context.__geoCallbacks.config.enableHighAccuracy, true);
  assert.equal(h.context.__geoCallbacks.config.timeout, 15000);
  assert.equal(h.context.__geoCallbacks.config.maximumAge, 0);
});

test("Farmer GPS handler clears stale coordinates when permission is denied", () => {
  const h = farmerMediaHarness({ geoError: { code: 1 } });
  h.fields.latitude.value = "26.03";
  h.fields.longitude.value = "88.46";
  h.fields.location_accuracy.value = "10";
  h.fields.location_captured_at.value = "2026-10-30T00:00:00.000Z";
  h.captureGps();
  assert.deepEqual(
    Object.fromEntries(Object.entries(h.fields).map(([key, field]) => [key, field.value])),
    { latitude: "", longitude: "", location_accuracy: "", location_captured_at: "" }
  );
  assert.match(h.status.textContent, /অনুমতি দেওয়া হয়নি/);
});

test("Farmer GPS handler rejects invalid coordinate results and clears stale values", () => {
  const h = farmerMediaHarness({ position: {
    coords: { latitude: 120, longitude: 88.46, accuracy: 10 },
    timestamp: Date.parse("2026-10-31T01:00:00.000Z")
  } });
  h.fields.latitude.value = "old";
  h.captureGps();
  assert.equal(h.fields.latitude.value, "");
  assert.equal(h.fields.longitude.value, "");
  assert.match(h.status.textContent, /GPS তথ্য সঠিক নয়/);
});

test("Farmer GPS handler reports unsupported browser without retaining old location", () => {
  const h = farmerMediaHarness({ navigator: {} });
  h.fields.latitude.value = "old";
  h.fields.longitude.value = "old";
  h.captureGps();
  assert.equal(h.fields.latitude.value, "");
  assert.equal(h.fields.longitude.value, "");
  assert.match(h.status.textContent, /GPS সমর্থিত নয়/);
});


test("Farmer GPS handler rejects out-of-range longitude and invalid accuracy", () => {
  const longitude = farmerMediaHarness({ position: {
    coords: { latitude: 26.03, longitude: -181, accuracy: 10 },
    timestamp: Date.parse("2026-10-31T01:00:00.000Z")
  } });
  longitude.captureGps();
  assert.equal(longitude.fields.latitude.value, "");
  assert.equal(longitude.fields.longitude.value, "");
  assert.match(longitude.status.textContent, /GPS তথ্য সঠিক নয়/);

  const accuracy = farmerMediaHarness({ position: {
    coords: { latitude: 26.03, longitude: 88.46, accuracy: Number.NaN },
    timestamp: Date.parse("2026-10-31T01:00:00.000Z")
  } });
  accuracy.captureGps();
  assert.equal(accuracy.fields.latitude.value, "");
  assert.equal(accuracy.fields.longitude.value, "");
  assert.match(accuracy.status.textContent, /GPS তথ্য সঠিক নয়/);
});


test("Farmer submit callback maps photo GPS address and registration fields into the insert payload", async () => {
  let handler = null;
  let inserted = null;
  const photo = "data:image/jpeg;base64,QUJDRA==";
  const form = { id: "farmerForm" };
  const photoInput = { dataset: { compressedDataUrl: photo } };
  const context = {
    bindForm(id, callback) {
      assert.equal(id, "farmerForm");
      handler = callback;
    },
    $(id) {
      if (id === "farmerPhoto") return photoInput;
      if (id === "farmerForm") return form;
      return null;
    },
    assertFarmerBranchAvailable(value) { return value; },
    normalizeFarmerMobile(value) { return value; },
    async assertFarmerCodeAvailable(value) { return value; },
    normalizeFarmerLocalitySelection(value) {
      assert.equal(value.farmer_union_name, "union::আকচা");
      return "আকচা";
    },
    n(value) { return Number(value) || 0; },
    async insertRow(table, payload, actualForm) {
      inserted = { table, payload, actualForm };
      return { saved: true };
    }
  };
  const start = html.indexOf('bindForm("farmerForm",async f=>{');
  const end = html.indexOf('\n$("saveCollectionDraft")', start);
  assert.ok(start >= 0 && end > start, "actual Farmer submit callback must exist");
  vm.runInNewContext(html.slice(start, end), context, { filename: "actual-farmer-submit-payload.js" });
  assert.equal(typeof handler, "function");
  const formData = {
    farmer_code: "F-1001",
    name: "পরীক্ষামূলক কৃষক",
    mobile: "01700000000",
    farmer_village_name: "আকচা গ্রাম",
    village: "",
    farmer_country: "বাংলাদেশ",
    farmer_division: "রংপুর",
    farmer_district: "ঠাকুরগাঁও",
    farmer_upazila: "ঠাকুরগাঁও সদর",
    farmer_union_name: "union::আকচা",
    branch_id: "branch-1",
    expected_liters: "25",
    latitude: "26.03",
    longitude: "88.46",
    location_accuracy: "12",
    location_captured_at: "2026-10-31T01:00:00.000Z",
    registered_at: "2026-10-31T01:00:00.000Z"
  };
  await handler(formData, form);
  assert.equal(inserted.table, "farmers");
  assert.equal(inserted.actualForm, form);
  assert.deepEqual(
    JSON.parse(JSON.stringify(inserted.payload)),
    {
      farmer_code: "F-1001",
      name: "পরীক্ষামূলক কৃষক",
      mobile: "01700000000",
      village: "আকচা গ্রাম",
      country: "বাংলাদেশ",
      division: "রংপুর",
      district: "ঠাকুরগাঁও",
      upazila: "ঠাকুরগাঁও সদর",
      union_name: "আকচা",
      village_name: "আকচা গ্রাম",
      branch_id: "branch-1",
      expected_liters: 25,
      photo_data_url: photo,
      latitude: 26.03,
      longitude: 88.46,
      location_accuracy: 12,
      location_captured_at: "2026-10-31T01:00:00.000Z",
      registered_at: "2026-10-31T01:00:00.000Z"
    }
  );
});


test("Farmer photo and GPS insert payload fields are covered by the TEST-first SQL migration", () => {
  const migration = fs.readFileSync(
    "supabase/migrations/202610280001_farmer_photo_location.sql",
    "utf8"
  );
  for (const [column, type] of [
    ["photo_data_url", "text"],
    ["latitude", "double precision"],
    ["longitude", "double precision"],
    ["location_accuracy", "double precision"],
    ["location_captured_at", "timestamptz"]
  ]) {
    assert.match(
      migration,
      new RegExp("add column if not exists\\s+" + column + "\\s+" + type, "i"),
      column + " must exist in the photo/GPS migration with the expected type"
    );
  }
  assert.match(migration, /farmers_latitude_range_check/);
  assert.match(migration, /farmers_longitude_range_check/);
  assert.match(migration, /farmers_location_pair_check/);
  assert.match(migration, /farmers_photo_data_url_size_check/);
  assert.match(migration, /between -90 and 90/i);
  assert.match(migration, /between -180 and 180/i);
  assert.match(migration, /length\(photo_data_url\) <= 650000/i);
});

test("Farmer registered_at insert payload is covered by a nullable timestamp migration with database default", () => {
  const migration = fs.readFileSync(
    "supabase/migrations/202610310001_farmer_registered_at.sql",
    "utf8"
  );
  assert.match(migration, /add column if not exists\s+registered_at\s+timestamptz/i);
  assert.match(migration, /alter column registered_at set default now\(\)/i);
  assert.match(migration, /legacy rows may remain NULL/i);
});


test("Farmer TEST schema preflight reports every payload column and constraint validation state", () => {
  const diagnostic = fs.readFileSync(
    "supabase/diagnostics/farmer_photo_schema_preflight.sql",
    "utf8"
  );
  for (const column of [
    "photo_data_url", "latitude", "longitude", "location_accuracy",
    "location_captured_at", "registered_at"
  ]) {
    assert.ok(diagnostic.includes("'" + column + "'"), column + " must be included in TEST preflight");
  }
  assert.match(diagnostic, /actual\.data_type\s+as actual_data_type/i);
  assert.match(diagnostic, /actual\.column_default/i);
  assert.match(diagnostic, /con\.convalidated/i);
  assert.match(diagnostic, /NOT VALID constraints still protect new inserts\/updates/i);
});


test("Farmer photo storage preflight inventories Storage schema and object policies without mutation", () => {
  const diagnostic = fs.readFileSync(
    "supabase/diagnostics/farmer_photo_schema_preflight.sql",
    "utf8"
  );
  assert.ok(diagnostic.includes("from information_schema.columns"));
  assert.ok(diagnostic.includes("where table_schema = 'storage'"));
  assert.ok(diagnostic.includes("table_name in ('buckets', 'objects')"));
  assert.ok(diagnostic.includes("from pg_policies"));
  assert.ok(diagnostic.includes("where schemaname = 'storage'"));
  assert.ok(diagnostic.includes("and tablename = 'objects'"));
  assert.ok(diagnostic.includes("does not create a bucket"));
  assert.ok(diagnostic.includes("backup/restore and orphan-file cleanup"));
  assert.ok(diagnostic.includes("keep the current optional compressed data-URL path unchanged"));
});


// Exercise the real per-user offline snapshot helpers with synthetic Farmer data.
function offlineFarmerSnapshotHarness() {
  const start = html.indexOf("const OFFLINE_CACHE_PREFIX");
  const end = html.indexOf("const bdParts", start);
  assert.ok(start >= 0 && end > start, "actual offline snapshot helpers must exist");
  const storage = new Map();
  const state = {
    settings: null, milkCollectionSettings: null,
    branches: [], farmers: [], collections: [], payments: [],
    feedProducts: [], feedPurchases: [], feedSales: [],
    vetCompanies: [], vetProducts: [], vetPurchases: [], vetSales: [],
    agroProducts: [], agroPurchases: [], agroSales: []
  };
  let renderCount = 0;
  let statusText = "";
  const context = {
    state,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    navigator: { onLine: false },
    $: id => id === "offlineModeStatus" ? { set textContent(value) { statusText = value; } } : null,
    render() { renderCount++; },
    dateTimeBD(value) { return String(value); },
    console: { warn() {} },
    Date
  };
  vm.runInNewContext(html.slice(start, end) + "\nglobalThis.__offline = { offlineSnapshotForUser, saveOfflineSnapshot, restoreOfflineSnapshot };", context, { filename: "actual-offline-snapshot.js" });
  return { context, storage, state, status: () => statusText, renders: () => renderCount, api: context.__offline };
}

test("Farmer photo and GPS metadata survive the actual user-scoped offline snapshot", () => {
  const h = offlineFarmerSnapshotHarness();
  h.state.farmers = [{
    id: "farmer-test-1",
    name: "নমুনা কৃষক",
    photo_data_url: "data:image/jpeg;base64,QUJDRA==",
    latitude: 26.03,
    longitude: 88.46,
    location_accuracy: 12,
    location_captured_at: "2026-10-31T01:00:00.000Z"
  }];
  assert.equal(h.api.saveOfflineSnapshot("user-test-1"), true);
  const raw = h.storage.get("muhaimin-offline-cache-v1:user-test-1");
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.user_id, "user-test-1");
  assert.equal(parsed.data.farmers[0].photo_data_url, "data:image/jpeg;base64,QUJDRA==");
  assert.equal(parsed.data.farmers[0].latitude, 26.03);
  assert.equal(parsed.data.farmers[0].longitude, 88.46);
  assert.equal(parsed.data.farmers[0].location_accuracy, 12);
  assert.equal(parsed.data.farmers[0].location_captured_at, "2026-10-31T01:00:00.000Z");
});

test("offline snapshot refuses another user's Farmer records and restores only the matching user", () => {
  const h = offlineFarmerSnapshotHarness();
  h.state.farmers = [{ id: "farmer-user-a", name: "A", photo_data_url: null }];
  assert.equal(h.api.saveOfflineSnapshot("user-a"), true);
  h.state.farmers = [{ id: "farmer-user-b", name: "B", photo_data_url: null }];
  assert.equal(h.api.saveOfflineSnapshot("user-b"), true);
  h.state.farmers = [];
  assert.equal(h.api.restoreOfflineSnapshot("user-a"), true);
  assert.equal(h.state.farmers[0].id, "farmer-user-a");
  assert.equal(h.api.offlineSnapshotForUser("user-b").data.farmers[0].id, "farmer-user-b");
  assert.equal(h.api.offlineSnapshotForUser("user-c"), null);
  assert.equal(h.renders(), 1);
});

test("offline snapshot reports storage quota failure without claiming a successful cache", () => {
  const h = offlineFarmerSnapshotHarness();
  h.state.farmers = [{ id: "farmer-test-1", photo_data_url: "data:image/jpeg;base64,QUJDRA==" }];
  h.context.localStorage.setItem = () => { throw new Error("quota exceeded"); };
  assert.equal(h.api.saveOfflineSnapshot("user-test-1"), false);
  assert.equal(h.storage.size, 0);
});
