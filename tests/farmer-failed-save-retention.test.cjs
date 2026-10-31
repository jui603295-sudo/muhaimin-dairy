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
  const status = { textContent: "" };
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

test("Farmer photo handler clears file and preview if compression remains above the database limit", async () => {
  const h = farmerMediaHarness({ dataUrl: "data:image/jpeg;base64," + "A".repeat(650001) });
  await h.choosePhoto({ type: "image/jpeg", size: 2048 });
  assert.equal(h.photoInput.value, "");
  assert.equal(h.photoInput.dataset.compressedDataUrl, undefined);
  assert.equal(h.preview.src, "");
  assert.equal(h.preview.classes.has("hidden"), true);
  assert.match(h.toasts[0], /কমপ্রেস করার পরও ছবিটি বড়/);
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
