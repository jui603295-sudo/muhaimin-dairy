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
