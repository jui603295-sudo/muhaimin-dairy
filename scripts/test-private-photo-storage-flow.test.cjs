"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

test("Branch and Farmer forms expose private photo inputs and previews", () => {
  for (const id of ["branchPhoto","branchPhotoPreview","farmerPhoto","farmerPhotoPreview"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
});

test("both record forms save through the private photo workflow", () => {
  assert.match(html, /bindForm\("branchForm",f=>saveRecordWithPrivatePhoto\("branch",f\)\)/);
  assert.match(html, /bindForm\("farmerForm",f=>saveRecordWithPrivatePhoto\("farmer",f\)\)/);
});

test("private photo uploads require a verified user and use private Storage buckets", () => {
  assert.match(html, /sb\.auth\.getUser\(\)/);
  assert.match(html, /sb\.storage\.from\(bucket\)\.upload\(path,blob/);
  assert.match(html, /upsert:false/);
  assert.match(html, /contentType:"image\/jpeg"/);
  assert.match(html, /muhaimin-branch-photos/);
  assert.match(html, /muhaimin-farmer-photos/);
});

test("record rows store private paths and keep legacy data URLs only when no new photo is chosen", () => {
  assert.match(html, /photo_path:uploadedPhotoPath\|\|existing\?\.photo_path\|\|null/);
  assert.match(html, /photo_data_url:hasNewPhoto\?null:\(existing\?\.photo_data_url\|\|null\)/);
});

test("private images are reopened with signed URLs, never public URLs", () => {
  assert.match(html, /createSignedUrl\(path,3600\)/);
  assert.doesNotMatch(html, /getPublicUrl\(/);
});

test("replacing a photo cleans up the new upload on record failure and the old upload after success", () => {
  assert.match(html, /catch\(error\)\{[\s\S]*?removePrivateRecordPhoto\(bucket,uploadedPath\)/);
  assert.match(html, /if\(uploadedPath&&oldPath&&oldPath!==uploadedPath\)/);
  assert.match(html, /await removePrivateRecordPhoto\(bucket,oldPath\)/);
});

test("photo uploads enforce JPEG output and the private bucket size limit", () => {
  assert.match(html, /blob\.type!=="image\/jpeg"/);
  assert.match(html, /blob\.size>5\*1024\*1024/);
  assert.match(html, /data\.length>650000/);
});
