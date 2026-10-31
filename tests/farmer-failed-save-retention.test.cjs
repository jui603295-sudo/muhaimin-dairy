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


test("missing time-column schema error gives a clear recovery message and preserves Farmer form/photo state", async () => {
  const h = harness({ error: { code: "PGRST204", message: "column registered_time does not exist in schema cache" } });
  await assert.rejects(
    h.insert("farmers", { name: "পরীক্ষামূলক কৃষক", registered_time: "2026-10-31T01:00:00.000Z" }),
    error => error && error.message.includes("সময়ের কলাম খুঁজে পাওয়া যায়নি")
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
