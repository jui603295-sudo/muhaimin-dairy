const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const addressTree = JSON.parse(fs.readFileSync("data/bangladesh-address.json", "utf8"));
const html = fs.readFileSync("index.html", "utf8");
const pickerStart = html.indexOf("// Offline cascading Bangladesh address picker");
const pickerEnd = html.indexOf("initFarmerAddressPicker().catch", pickerStart);
assert.ok(pickerStart >= 0 && pickerEnd > pickerStart, "Farmer address picker source must be present");
const pickerSource = html.slice(pickerStart, pickerEnd) +
  "\nglobalThis.__initPicker = initFarmerAddressPicker;";

class FakeElement {
  constructor(tag = "select") {
    this.tagName = tag.toUpperCase();
    this.options = [];
    this.children = this.options;
    this.value = "";
    this.disabled = false;
    this.textContent = "";
    this.listeners = new Map();
    this.dataset = {};
    this.classNames = new Set();
    this.classList = {
      add: name => this.classNames.add(name),
      remove: name => this.classNames.delete(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classNames.has(name) : Boolean(force);
        if (shouldAdd) this.classNames.add(name);
        else this.classNames.delete(name);
        return shouldAdd;
      },
      contains: name => this.classNames.has(name)
    };
    this.elements = {};
  }
  replaceChildren(...items) {
    this.options.splice(0, this.options.length, ...items);
    this.value = this.options[0]?.value || "";
  }
  appendChild(item) {
    this.options.push(item);
    if (this.options.length === 1) this.value = item.value || "";
    return item;
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatch(type) {
    for (const callback of this.listeners.get(type) || []) callback({ target: this });
  }
  focus() { this.focused = true; }
}

function makePicker() {
  const ids = [
    "farmerDivision", "farmerDistrict", "farmerUpazila", "farmerUnion",
    "farmerLocalityManual", "farmerAddressStatus", "farmerForm"
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id === "farmerForm" ? "form" : "select")]));
  elements.farmerForm.elements.farmer_village_name = new FakeElement("input");
  const context = {
    console,
    document: { createElement: tag => new FakeElement(tag) },
    fetch: async () => ({ ok: true, json: async () => addressTree }),
    $(id) { return elements[id] || null; }
  };
  vm.runInNewContext(pickerSource, context, { filename: "farmer-address-picker.js" });
  return context.__initPicker().then(() => ({
    elements,
    select(id, value) {
      const element = elements[id];
      element.value = value;
      element.dispatch("change");
    }
  }));
}

test("Thakurgaon address cascade loads the expected hierarchy and locality choices", async () => {
  const h = await makePicker();
  h.select("farmerDivision", "রংপুর");
  assert.ok(h.elements.farmerDistrict.options.some(x => x.value === "ঠাকুরগাঁও"));
  h.select("farmerDistrict", "ঠাকুরগাঁও");
  assert.ok(h.elements.farmerUpazila.options.some(x => x.value === "ঠাকুরগাঁও সদর"));
  h.select("farmerUpazila", "ঠাকুরগাঁও সদর");
  const localityValues = h.elements.farmerUnion.options.map(x => x.value);
  assert.equal(localityValues.filter(x => x.startsWith("union::")).length, 21);
  assert.equal(localityValues.filter(x => x.startsWith("pourashava::")).length, 1);
  assert.ok(localityValues.includes("manual"));
  assert.equal(h.elements.farmerUnion.disabled, false);
});

test("duplicate Union labels are rendered once in the selected locality list", async () => {
  const h = await makePicker();
  h.select("farmerDivision", "বরিশাল");
  h.select("farmerDistrict", "ভোলা");
  h.select("farmerUpazila", "চরফ্যাশন");
  const values = h.elements.farmerUnion.options.map(x => x.value);
  assert.equal(values.filter(x => x === "union::আওয়াজপুর").length, 1);
});

test("manual locality input toggles safely and clears when a listed locality is selected", async () => {
  const h = await makePicker();
  h.select("farmerDivision", "রংপুর");
  h.select("farmerDistrict", "ঠাকুরগাঁও");
  h.select("farmerUpazila", "ঠাকুরগাঁও সদর");
  const manual = h.elements.farmerLocalityManual;
  h.select("farmerUnion", "manual");
  assert.equal(manual.disabled, false);
  assert.equal(manual.classList.contains("hidden"), false);
  manual.value = "পরীক্ষামূলক গ্রাম";
  h.select("farmerUnion", "union::আকচা");
  assert.equal(manual.disabled, true);
  assert.equal(manual.value, "");
  assert.equal(manual.classList.contains("hidden"), true);
});

test("changing a parent selection clears stale lower-level locality and village values", async () => {
  const h = await makePicker();
  h.select("farmerDivision", "রংপুর");
  h.select("farmerDistrict", "ঠাকুরগাঁও");
  h.select("farmerUpazila", "ঠাকুরগাঁও সদর");
  h.select("farmerUnion", "manual");
  h.elements.farmerLocalityManual.value = "পুরোনো নাম";
  h.elements.farmerForm.elements.farmer_village_name.value = "পুরোনো গ্রাম";
  h.select("farmerDistrict", "পঞ্চগড়");
  assert.equal(h.elements.farmerUpazila.value, "");
  assert.equal(h.elements.farmerUnion.value, "");
  assert.equal(h.elements.farmerUnion.disabled, true);
  assert.equal(h.elements.farmerLocalityManual.value, "");
  assert.equal(h.elements.farmerLocalityManual.disabled, true);
  assert.equal(h.elements.farmerForm.elements.farmer_village_name.value, "");
});

test("address dataset network failure rejects initialization instead of enabling an empty picker", async () => {
  const context = {
    console,
    document: { createElement: tag => new FakeElement(tag) },
    fetch: async () => ({ ok: false, status: 503 }),
    $() { return new FakeElement(); }
  };
  vm.runInNewContext(pickerSource.replace("\\nglobalThis.__pickerReady = initFarmerAddressPicker();", ""), context, { filename: "farmer-address-picker-network-failure.js" });
  await assert.rejects(context.initFarmerAddressPicker(), /বাংলাদেশের ঠিকানার ডেটা লোড করা যায়নি/);
});

test("malformed root address dataset is rejected before exposing division choices", async () => {
  const context = {
    console,
    document: { createElement: tag => new FakeElement(tag) },
    fetch: async () => ({ ok: true, json: async () => [{ bn: "শুধু একটি বিভাগ", districts: [] }] }),
    $() { return new FakeElement(); }
  };
  vm.runInNewContext(pickerSource.replace("\\nglobalThis.__pickerReady = initFarmerAddressPicker();", ""), context, { filename: "farmer-address-picker-invalid-data.js" });
  await assert.rejects(context.initFarmerAddressPicker(), /ঠিকানার ডেটা যাচাই করা যায়নি/);
});

test("all administrative parent-child options stay connected to the source dataset", async () => {
  const h = await makePicker();
  assert.deepEqual(
    h.elements.farmerDivision.options.slice(1).map(x => x.value),
    addressTree.map(x => x.bn)
  );
  let districtTotal = 0;
  let upazilaTotal = 0;
  let unionTotal = 0;
  let pourashavaTotal = 0;

  for (const division of addressTree) {
    h.select("farmerDivision", division.bn);
    assert.deepEqual(
      h.elements.farmerDistrict.options.slice(1).map(x => x.value),
      division.districts.map(x => x.bn),
      "district choices must match division " + division.bn
    );
    districtTotal += division.districts.length;

    for (const district of division.districts) {
      h.select("farmerDistrict", district.bn);
      assert.deepEqual(
        h.elements.farmerUpazila.options.slice(1).map(x => x.value),
        district.upazilas.map(x => x.bn),
        "Upazila choices must match district " + district.bn
      );
      upazilaTotal += district.upazilas.length;

      for (const upazila of district.upazilas) {
        h.select("farmerUpazila", upazila.bn);
        const unique = items => {
          const seen = new Set();
          return items.filter(item => {
            const key = String(item.bn || "").trim().normalize("NFC");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };
        const expected = [
          ...unique(upazila.unions || []).map(x => "union::" + x.bn),
          ...unique(upazila.pourashavas || []).map(x => "pourashava::" + x.bn),
          "manual"
        ];
        assert.deepEqual(
          h.elements.farmerUnion.options.slice(1).map(x => x.value),
          expected,
          "locality choices must match Upazila " + upazila.bn + " / " + district.bn
        );
        unionTotal += (upazila.unions || []).length;
        pourashavaTotal += (upazila.pourashavas || []).length;
      }
    }
  }

  assert.equal(addressTree.length, 8);
  assert.equal(districtTotal, 64);
  assert.equal(upazilaTotal, 495);
  assert.equal(unionTotal, 4540);
  assert.equal(pourashavaTotal, 328);
});

test("farmer locality submit normalization accepts listed types and trims manual entries", () => {
  const start = html.indexOf("function normalizeFarmerLocalitySelection");
  const end = html.indexOf("function setFarmerRegistrationTime", start);
  assert.ok(start >= 0 && end > start, "locality normalization helper must exist");
  const source = html.slice(start, end) +
    "\nglobalThis.__normalizeLocality = normalizeFarmerLocalitySelection;";
  const context = { lang: () => "bn" };
  vm.runInNewContext(source, context, { filename: "farmer-locality-submit.js" });

  assert.equal(
    context.__normalizeLocality({ farmer_union_name: "manual", farmer_locality_manual: "  নতুন গ্রাম  " }),
    "নতুন গ্রাম"
  );
  assert.equal(
    context.__normalizeLocality({ farmer_union_name: "union::আকচা" }),
    "আকচা"
  );
  assert.equal(
    context.__normalizeLocality({ farmer_union_name: "pourashava::ঠাকুরগাঁও" }),
    "ঠাকুরগাঁও"
  );
  assert.equal(context.__normalizeLocality({ farmer_union_name: "" }), null);
});

test("farmer locality submit rejects blank manual names and malformed locality values", () => {
  const start = html.indexOf("function normalizeFarmerLocalitySelection");
  const end = html.indexOf("function setFarmerRegistrationTime", start);
  const source = html.slice(start, end) +
    "\nglobalThis.__normalizeLocality = normalizeFarmerLocalitySelection;";
  const context = { lang: () => "bn" };
  vm.runInNewContext(source, context, { filename: "farmer-locality-submit-validation.js" });

  assert.throws(
    () => context.__normalizeLocality({ farmer_union_name: "manual", farmer_locality_manual: "   " }),
    /ইউনিয়ন বা পৌরসভার নাম লিখুন/
  );
  assert.throws(
    () => context.__normalizeLocality({ farmer_union_name: "পুরোনো-অবৈধ-মান" }),
    /সঠিক ইউনিয়ন বা পৌরসভা নির্বাচন করুন/
  );
});


test("farmer save payload preserves registration time, compressed photo and captured GPS metadata", async () => {
  const marker = 'bindForm("farmerForm",async f=>{';
  const start = html.indexOf(marker);
  const end = html.indexOf('\n$("saveCollectionDraft")', start);
  assert.ok(start >= 0 && end > start, "Farmer form save handler must exist");
  const body = html.slice(start + marker.length, end).replace(/\}\);\s*$/, "");
  let saved = null;
  const photo = { dataset: { compressedDataUrl: "data:image/jpeg;base64,ZmFrZQ==" } };
  const form = new FakeElement("form");
  const context = {
    assertFarmerBranchAvailable: value => value,
    normalizeFarmerMobile: value => value,
    assertFarmerCodeAvailable: async value => value,
    normalizeFarmerLocalitySelection: () => "আকচা",
    n: value => Number(value),
    $: id => id === "farmerPhoto" ? photo : id === "farmerForm" ? form : null,
    insertRow: async (table, payload, targetForm) => {
      saved = { table, payload, targetForm };
      return saved;
    }
  };
  const saveHandler = vm.runInNewContext("(async function(f) {" + body + "\n})", context);
  await saveHandler({
    branch_id: "branch-1",
    mobile: "01700000000",
    farmer_code: "F-001",
    name: "পরীক্ষা কৃষক",
    farmer_village_name: "পরীক্ষা গ্রাম",
    village: "",
    farmer_country: "বাংলাদেশ",
    farmer_division: "রংপুর",
    farmer_district: "ঠাকুরগাঁও",
    farmer_upazila: "ঠাকুরগাঁও সদর",
    expected_liters: "25",
    latitude: "26.0337",
    longitude: "88.4617",
    location_accuracy: "18",
    location_captured_at: "2026-10-31T00:00:00.000Z",
    registered_at: "2026-10-31T00:00:00.000Z"
  });
  assert.equal(saved.table, "farmers");
  assert.equal(saved.payload.registered_at, "2026-10-31T00:00:00.000Z");
  assert.equal(saved.payload.photo_data_url, "data:image/jpeg;base64,ZmFrZQ==");
  assert.equal(saved.payload.latitude, 26.0337);
  assert.equal(saved.payload.longitude, 88.4617);
  assert.equal(saved.payload.location_accuracy, 18);
  assert.equal(saved.payload.location_captured_at, "2026-10-31T00:00:00.000Z");
  assert.equal(saved.payload.union_name, "আকচা");
  assert.equal(saved.payload.village_name, "পরীক্ষা গ্রাম");
  assert.equal(saved.payload.expected_liters, 25);
});

test("farmer save payload stores absent photo and GPS values as null, not stale data", async () => {
  const marker = 'bindForm("farmerForm",async f=>{';
  const start = html.indexOf(marker);
  const end = html.indexOf('\n$("saveCollectionDraft")', start);
  assert.ok(start >= 0 && end > start, "Farmer form save handler must exist");
  const body = html.slice(start + marker.length, end).replace(/\}\);\s*$/, "");
  let saved = null;
  const context = {
    assertFarmerBranchAvailable: value => value,
    normalizeFarmerMobile: value => value,
    assertFarmerCodeAvailable: async value => value,
    normalizeFarmerLocalitySelection: () => null,
    n: value => Number(value),
    $: () => ({ dataset: {} }),
    insertRow: async (table, payload) => { saved = payload; return payload; }
  };
  const saveHandler = vm.runInNewContext("(async function(f) {" + body + "\n})", context);
  await saveHandler({
    branch_id: "branch-1", mobile: "01700000000", farmer_code: "F-002",
    name: "নতুন কৃষক", farmer_village_name: "", village: "",
    farmer_country: "বাংলাদেশ", farmer_division: "", farmer_district: "",
    farmer_upazila: "", expected_liters: "0",
    latitude: "", longitude: "", location_accuracy: "", location_captured_at: "",
    registered_at: "2026-10-31T00:00:00.000Z"
  });
  assert.equal(saved.photo_data_url, null);
  assert.equal(saved.latitude, null);
  assert.equal(saved.longitude, null);
  assert.equal(saved.location_accuracy, null);
  assert.equal(saved.location_captured_at, null);
  assert.equal(saved.union_name, null);
});


function makeLocationCaptureHarness(geolocation) {
  const form = new FakeElement("form");
  form.elements = {
    latitude: { value: "stale-lat" },
    longitude: { value: "stale-lon" },
    location_accuracy: { value: "stale-accuracy" },
    location_captured_at: { value: "stale-time" }
  };
  const status = { textContent: "", dataset: {} };
  const sourceStart = html.indexOf('$("captureFarmerLocation")?.addEventListener("click",()=>{');
  const sourceEnd = html.indexOf('\nbindForm("branchForm"', sourceStart);
  assert.ok(sourceStart >= 0 && sourceEnd > sourceStart, "GPS capture handler must exist");
  const marker = '$("captureFarmerLocation")?.addEventListener("click",()=>{';
  const body = html.slice(sourceStart + marker.length, sourceEnd).replace(/\}\);\s*$/, "");
  const context = {
    $: id => id === "farmerForm" ? form : id === "farmerLocationStatus" ? status : null,
    navigator: { geolocation }
  };
  const click = vm.runInNewContext("(() => {" + body + "\n})", context);
  return { form, status, click };
}

test("GPS capture stores fresh valid coordinates, accuracy and capture timestamp", () => {
  let options;
  const harness = makeLocationCaptureHarness({
    getCurrentPosition(success, failure, suppliedOptions) {
      options = suppliedOptions;
      success({
        coords: { latitude: 26.0337, longitude: 88.4617, accuracy: 17.6 },
        timestamp: Date.parse("2026-10-31T00:30:00.000Z")
      });
    }
  });
  harness.click();
  assert.equal(harness.form.elements.latitude.value, "26.0337");
  assert.equal(harness.form.elements.longitude.value, "88.4617");
  assert.equal(harness.form.elements.location_accuracy.value, "18");
  assert.equal(harness.form.elements.location_captured_at.value, "2026-10-31T00:30:00.000Z");
  assert.equal(options.enableHighAccuracy, true);
  assert.equal(options.maximumAge, 0);
  assert.match(harness.status.textContent, /নির্ভুলতা প্রায় 18 মিটার/);
});

test("GPS permission failure clears all previously captured coordinates and metadata", () => {
  const harness = makeLocationCaptureHarness({
    getCurrentPosition(success, failure) { failure({ code: 1 }); }
  });
  harness.click();
  assert.equal(harness.form.elements.latitude.value, "");
  assert.equal(harness.form.elements.longitude.value, "");
  assert.equal(harness.form.elements.location_accuracy.value, "");
  assert.equal(harness.form.elements.location_captured_at.value, "");
  assert.match(harness.status.textContent, /অনুমতি দেওয়া হয়নি/);
});

test("GPS capture rejects invalid coordinates and never retains stale location", () => {
  const harness = makeLocationCaptureHarness({
    getCurrentPosition(success) {
      success({
        coords: { latitude: Number.NaN, longitude: 88.4, accuracy: 12 },
        timestamp: Date.parse("2026-10-31T00:30:00.000Z")
      });
    }
  });
  harness.click();
  assert.equal(harness.form.elements.latitude.value, "");
  assert.equal(harness.form.elements.longitude.value, "");
  assert.equal(harness.form.elements.location_accuracy.value, "");
  assert.equal(harness.form.elements.location_captured_at.value, "");
  assert.match(harness.status.textContent, /GPS তথ্য সঠিক নয়/);
});
