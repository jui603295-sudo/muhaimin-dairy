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
