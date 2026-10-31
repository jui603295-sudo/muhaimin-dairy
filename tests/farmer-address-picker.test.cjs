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
  "\nglobalThis.__pickerReady = initFarmerAddressPicker();";

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
  return context.__pickerReady.then(() => ({
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
