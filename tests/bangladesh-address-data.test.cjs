const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const tree = JSON.parse(fs.readFileSync("data/bangladesh-address.json", "utf8"));

function namedItems(items, scope) {
  assert.ok(Array.isArray(items), scope + " must be an array");
  for (const item of items) {
    assert.equal(typeof item.bn, "string", scope + " Bengali name must be a string");
    assert.ok(item.bn.trim(), scope + " Bengali name must not be blank");
    assert.equal(typeof item.en, "string", scope + " English name must be a string");
    assert.ok(item.en.trim(), scope + " English name must not be blank");
  }
}

function duplicateNames(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    const name = item.bn.trim().normalize("NFC");
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates].sort();
}

function collectDataset() {
  const counts = { divisions: tree.length, districts: 0, upazilas: 0, unions: 0, pourashavas: 0 };
  const duplicateUnions = [];
  for (const division of tree) {
    namedItems([division], "division");
    namedItems(division.districts, "districts under " + division.bn);
    counts.districts += division.districts.length;
    for (const district of division.districts) {
      namedItems(district.upazilas, "upazilas under " + district.bn);
      counts.upazilas += district.upazilas.length;
      for (const upazila of district.upazilas) {
        namedItems(upazila.unions, "unions under " + district.bn + "/" + upazila.bn);
        namedItems(upazila.pourashavas, "pourashavas under " + district.bn + "/" + upazila.bn);
        counts.unions += upazila.unions.length;
        counts.pourashavas += upazila.pourashavas.length;
        const duplicates = duplicateNames(upazila.unions);
        if (duplicates.length) {
          duplicateUnions.push({
            district: district.bn,
            upazila: upazila.bn,
            names: duplicates
          });
        }
      }
    }
  }
  return { counts, duplicateUnions };
}

test("Bangladesh address dataset has complete hierarchy and expected record counts", () => {
  assert.ok(Array.isArray(tree), "root dataset must be an array");
  const { counts } = collectDataset();
  assert.deepEqual(counts, {
    divisions: 8,
    districts: 64,
    upazilas: 495,
    unions: 4540,
    pourashavas: 328
  });
});

test("address hierarchy contains no duplicate sibling divisions, districts or upazilas", () => {
  assert.deepEqual(duplicateNames(tree), []);
  for (const division of tree) {
    assert.deepEqual(duplicateNames(division.districts), [], "district duplicate under " + division.bn);
    for (const district of division.districts) {
      assert.deepEqual(duplicateNames(district.upazilas), [], "upazila duplicate under " + district.bn);
      for (const upazila of district.upazilas) {
        assert.deepEqual(
          duplicateNames(upazila.pourashavas),
          [],
          "pourashava duplicate under " + district.bn + "/" + upazila.bn
        );
      }
    }
  }
});

test("only the three previously audited Union source duplicates remain", () => {
  const { duplicateUnions } = collectDataset();
  const normalized = duplicateUnions
    .map(item => item.district + "/" + item.upazila + ":" + item.names.join(","))
    .sort();
  assert.deepEqual(normalized, [
    "পঞ্চগড়/তেতুলিয়া:ভজনপুর",
    "ভোলা/চরফ্যাশন:আওয়াজপুর",
    "মৌলভীবাজার/বড়লেখা:তালিমপুর"
  ]);
});

test("Thakurgaon Sadar path resolves to Rangpur with 21 unions and one pourashava", () => {
  const division = tree.find(item => item.bn === "রংপুর");
  assert.ok(division, "Rangpur division must exist");
  const district = division.districts.find(item => item.bn === "ঠাকুরগাঁও");
  assert.ok(district, "Thakurgaon district must exist under Rangpur");
  const upazila = district.upazilas.find(item => item.bn === "ঠাকুরগাঁও সদর");
  assert.ok(upazila, "Thakurgaon Sadar must exist under Thakurgaon");
  assert.equal(upazila.unions.length, 21);
  assert.equal(upazila.pourashavas.length, 1);
});
