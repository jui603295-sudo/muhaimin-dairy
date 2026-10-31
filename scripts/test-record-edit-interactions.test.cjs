"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");

function extractFunction(name) {
  const patterns = [new RegExp("async function " + name + "\\s*\\("), new RegExp("function " + name + "\\s*\\(")];
  let start = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) { start = match.index; break; }
  }
  if (start < 0) throw new Error("Function not found: " + name);
  const open = html.indexOf("{", start);
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = open; i < html.length; i++) {
    const ch = html[i], next = html[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
    if (ch === "\"" || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error("Unclosed function: " + name);
}

function makeElement(value = "") {
  const element = {
    value, textContent: "", src: "", dataset: {}, type: "text", classes: new Set(),
    classList: {
      add(name) { element.classes.add(name); },
      remove(name) { element.classes.delete(name); }
    },
    scrollIntoView(options) { this.scrolled = options; },
    reset() { this.wasReset = true; },
    get options() { return this._options || []; },
    set options(value) { this._options = value; }
  };
  return element;
}

function makeForm(names) {
  const fields = Object.fromEntries(names.map(name => [name, makeElement()]));
  return {
    elements: {
      namedItem(name) { return fields[name] || null; },
      record_id: fields.record_id
    },
    fields,
    scrollIntoView(options) { this.scrolled = options; },
    reset() { this.wasReset = true; Object.values(fields).forEach(field => field.value = ""); }
  };
}

function setup(kind) {
  const form = kind === "branch"
    ? makeForm(["record_id","code","name","target_liters","status","notes","branch_country","branch_village_name","branch_latitude","branch_longitude","branch_location_accuracy_m","branch_location_captured_at"])
    : makeForm(["record_id","farmer_code","name","mobile","village","farmer_country","farmer_village_name","branch_id","expected_liters","latitude","longitude","location_accuracy","location_captured_at"]);
  const ids = {
    [kind + "Form"]: form,
    [kind + "EditStatus"]: makeElement(),
    [kind + "SubmitButton"]: makeElement(),
    ["cancel" + (kind === "branch" ? "Branch" : "Farmer") + "Edit"]: makeElement(),
    [kind + "LocationStatus"]: makeElement()
  };
  if (kind === "farmer") {
    ids.farmerPhoto = makeElement();
    ids.farmerPhotoPreview = makeElement();
  }
  const restored = [];
  const context = {
    state: { branches: [], farmers: [] },
    $(id) { return ids[id] || null; },
    document: { getElementById(id) { return ids[id] || null; } },
    setFormValue(formArg,name,value) {
      const field = formArg.elements.namedItem(name);
      if (field && field.type !== "file") field.value = value == null ? "" : String(value);
    },
    async restoreAddressFields(prefix,record) { restored.push({prefix,record}); },
    String, Object, Error
  };
  return { form, ids, restored, context };
}

test("Branch Edit click handler pre-fills the selected record and restores its address", async () => {
  const x = setup("branch");
  const row = { id:"branch-42", code:"B042", name:"পরীক্ষা কেন্দ্র", target_liters:350,
    status:"Active", notes:"পরীক্ষা নোট", country:"বাংলাদেশ", division:"রংপুর",
    district:"ঠাকুরগাঁও", upazila:"ঠাকুরগাঁও সদর", union_name:"আকচা",
    village_name:"আকচা বাজার", latitude:26.03, longitude:88.46,
    location_accuracy_m:8, location_captured_at:"2026-10-31T02:00:00.000Z" };
  x.context.state.branches.push(row);
  vm.runInNewContext(extractFunction("editBranchRecord"), x.context);
  await vm.runInNewContext("editBranchRecord('branch-42')", x.context);
  assert.equal(x.form.fields.record_id.value, "branch-42");
  assert.equal(x.form.fields.name.value, "পরীক্ষা কেন্দ্র");
  assert.equal(x.form.fields.branch_latitude.value, "26.03");
  assert.equal(JSON.stringify(x.restored), JSON.stringify([{prefix:"branch",record:{
    division:"রংপুর",district:"ঠাকুরগাঁও",upazila:"ঠাকুরগাঁও সদর",
    union_name:"আকচা",village_name:"আকচা বাজার"
  }}]));
  assert.equal(x.ids.branchSubmitButton.textContent, "পরিবর্তন সংরক্ষণ");
  assert.equal(x.ids.branchEditStatus.classes.has("hidden"), false);
  assert.ok(x.form.scrolled);
});

test("Farmer Edit click handler restores profile, GPS and existing photo preview", async () => {
  const x = setup("farmer");
  const row = { id:"farmer-9", farmer_code:"F009", name:"পরীক্ষা কৃষক",
    mobile:"01700000000", village:"আকচা", country:"বাংলাদেশ", division:"রংপুর",
    district:"ঠাকুরগাঁও", upazila:"ঠাকুরগাঁও সদর", union_name:"আকচা",
    village_name:"আকচা", branch_id:"branch-42", expected_liters:20,
    latitude:26.03, longitude:88.46, location_accuracy:9,
    location_captured_at:"2026-10-31T02:01:00.000Z",
    photo_data_url:"data:image/jpeg;base64,PHOTO" };
  x.context.state.farmers.push(row);
  vm.runInNewContext(extractFunction("editFarmerRecord"), x.context);
  await vm.runInNewContext("editFarmerRecord('farmer-9')", x.context);
  assert.equal(x.form.fields.record_id.value, "farmer-9");
  assert.equal(x.form.fields.name.value, "পরীক্ষা কৃষক");
  assert.equal(x.form.fields.branch_id.value, "branch-42");
  assert.equal(x.form.fields.latitude.value, "26.03");
  assert.equal(x.ids.farmerPhoto.dataset.existingPhotoDataUrl, row.photo_data_url);
  assert.equal(x.ids.farmerPhotoPreview.src, row.photo_data_url);
  assert.equal(x.ids.farmerPhotoPreview.classes.has("hidden"), false);
  assert.equal(x.ids.farmerSubmitButton.textContent, "পরিবর্তন সংরক্ষণ");
  assert.equal(x.restored[0].prefix, "farmer");
});

test("Edit handlers reject stale record IDs instead of opening an empty edit form", async () => {
  const x = setup("branch");
  vm.runInNewContext(extractFunction("editBranchRecord"), x.context);
  await assert.rejects(vm.runInNewContext("editBranchRecord('missing-id')", x.context), /কেন্দ্রের রেকর্ড পাওয়া যায়নি/);
});

test("Update writes to the selected row ID and only clears edit state after confirmed readback", async () => {
  const calls = [];
  const context = {
    sb: { from(table) { calls.push(["from",table]); return {
      update(data) { calls.push(["update",data]); return {
        eq(column,id) { calls.push(["eq",column,id]); return {
          select(columns) { calls.push(["select",columns]); return {
            async maybeSingle() { calls.push(["maybeSingle"]); return {data:{id:"branch-42"},error:null}; }
          }; }
        }; }
      }; }
    }; } },
    clearEditState(kind) { calls.push(["clear",kind]); },
    logActivity(message) { calls.push(["log",message]); },
    toast(message) { calls.push(["toast",message]); },
    lang() { return "bn"; },
    async loadAll() { calls.push(["loadAll"]); },
    Error, String
  };
  vm.runInNewContext(extractFunction("updateRow"), context);
  await vm.runInNewContext("updateRow('branches','branch-42',{name:'সংশোধিত'}, {})", context);
  assert.deepEqual(calls.map(x=>x[0]), ["from","update","eq","select","maybeSingle","clear","log","toast","loadAll"]);
  assert.deepEqual(calls[2], ["eq","id","branch-42"]);
});

test("Update with no returned row fails closed and does not clear the form", async () => {
  const calls = [];
  const context = {
    sb: { from() { return { update() { return { eq() { return { select() { return {
      async maybeSingle() { return {data:null,error:null}; }
    }; } }; } }; } }; } },
    clearEditState() { calls.push("clear"); },
    logActivity() { calls.push("log"); }, toast() {}, lang() { return "bn"; },
    async loadAll() { calls.push("load"); }, Error
  };
  vm.runInNewContext(extractFunction("updateRow"), context);
  await assert.rejects(vm.runInNewContext("updateRow('farmers','farmer-9',{}, {})", context), /আপডেট হয়েছে কি না নিশ্চিত/);
  assert.deepEqual(calls, []);
});

test("Update errors preserve edit state for correction and retry", async () => {
  const calls = [];
  const context = {
    sb: { from() { return { update() { return { eq() { return { select() { return {
      async maybeSingle() { return {data:null,error:{message:"permission denied"}}; }
    }; } }; } }; } }; } },
    clearEditState() { calls.push("clear"); },
    logActivity() { calls.push("log"); }, toast() {}, lang() { return "bn"; },
    async loadAll() { calls.push("load"); }, Error
  };
  vm.runInNewContext(extractFunction("updateRow"), context);
  await assert.rejects(vm.runInNewContext("updateRow('branches','branch-42',{}, {})", context), error => error && error.message === "permission denied");
  assert.deepEqual(calls, []);
});

test("Actual Bangladesh address cascade restores division, district, upazila, union and village", async () => {
  class FakeOption { constructor(text,value) { this.text=text; this.value=value; } }
  class FakeSelect {
    constructor() { this.options=[]; this.listeners={}; this._value=""; this.value=""; }
    set value(value) {
      const candidate=String(value ?? "");
      this._value=this.options.some(option=>option.value===candidate)?candidate:"";
    }
    get value() { return this._value; }
    addEventListener(type,handler) { this.listeners[type]=handler; }
    dispatchEvent() { this.listeners.change?.(); return true; }
    replaceChildren(option) { this.options=[option]; this._value=option.value; }
    add(option) { this.options.push(option); }
  }
  const labels={
    division:new FakeSelect(),district:new FakeSelect(),upazila:new FakeSelect(),
    union:new FakeSelect(),status:makeElement(),village:makeElement()
  };
  const data=[{bn_name:"রংপুর",districts:[{bn_name:"ঠাকুরগাঁও",upazilas:[{
    bn_name:"ঠাকুরগাঁও সদর",unions:[{bn_name:"আকচা"},{bn_name:"রুহিয়া"}],pourashavas:[{bn_name:"ঠাকুরগাঁও পৌরসভ"}]
  }]}]}];
  const context={
    Option:FakeOption,Event:class {constructor(type){this.type=type;}},
    document:{getElementById(id){return labels[id.replace("branch","").toLowerCase()]||null;}},
    async loadBangladeshAddressTree(){return data;},
    Array,Set,String,
    addressCascadeReady:{},addressCascadeControllers:{}
  };
  const cascadeStart=html.indexOf("function bdLabel(item)");
  const initCall=html.indexOf('initAddressCascade("branch");',cascadeStart);
  const restoreStart=html.indexOf("async function restoreAddressFields");
  const restoreEnd=html.indexOf("function clearEditState",restoreStart);
  if(cascadeStart<0||initCall<0||restoreStart<0||restoreEnd<0)throw new Error("Address cascade functions not found");
  vm.runInNewContext(html.slice(cascadeStart,initCall)+html.slice(restoreStart,restoreEnd),context,{timeout:1000});
  vm.runInNewContext('initAddressCascade("branch")',context);
  await vm.runInNewContext('restoreAddressFields("branch",{division:"রংপুর",district:"ঠাকুরগাঁও",upazila:"ঠাকুরগাঁও সদর",union_name:"আকচা",village_name:"আকচা বাজার"})',context);
  assert.deepEqual(
    [labels.division.value,labels.district.value,labels.upazila.value,labels.union.value,labels.village.value],
    ["রংপুর","ঠাকুরগাঁও","ঠাকুরগাঁও সদর","আকচা","আকচা বাজার"]
  );
});

test("Address cascade rejects an unavailable child option instead of retaining stale selection", async () => {
  class FakeOption { constructor(text,value) { this.text=text; this.value=value; } }
  class FakeSelect {
    constructor() { this.options=[]; this.listeners={}; this._value=""; }
    set value(value) { const candidate=String(value??"");this._value=this.options.some(o=>o.value===candidate)?candidate:""; }
    get value() { return this._value; }
    addEventListener(type,handler) { this.listeners[type]=handler; }
    dispatchEvent() { this.listeners.change?.(); }
    replaceChildren(option) { this.options=[option];this._value=option.value; }
    add(option) { this.options.push(option); }
  }
  const elements={};
  ["branchDivision","branchDistrict","branchUpazila","branchUnion","branchAddressStatus","branchVillage"].forEach(id=>elements[id]=new FakeSelect());
  const data=[{bn_name:"রংপুর",districts:[{bn_name:"ঠাকুরগাঁও",upazilas:[{bn_name:"ঠাকুরগাঁও সদর",unions:[{bn_name:"আকচা"}]}]}]}];
  const context={Option:FakeOption,Event:class{},document:{getElementById:id=>elements[id]||null},
    async loadBangladeshAddressTree(){return data;},Array,Set,String,addressCascadeReady:{},addressCascadeControllers:{}};
  const a=html.indexOf("function bdLabel(item)"),b=html.indexOf('initAddressCascade("branch");',a);
  vm.runInNewContext(html.slice(a,b),context);
  vm.runInNewContext('initAddressCascade("branch")',context);
  await vm.runInNewContext('restoreAddressFields("branch",{division:"রংপুর",district:"ভুল জেলা",upazila:"ঠাকুরগাঁও সদর",union_name:"আকচা",village_name:"গ্রাম"})',context);
  assert.equal(elements.branchDistrict.value,"");
  assert.equal(elements.branchUpazila.value,"");
  assert.equal(elements.branchUnion.value,"");
});
