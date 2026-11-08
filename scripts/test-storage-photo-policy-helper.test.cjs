"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync(
  "supabase/migrations/20261108220409_test2_storage_photo_policy_private_role_helper_v1.sql",
  "utf8"
);

test("TEST 2 Storage migration changes only existing photo policies", () => {
  assert.match(migration, /ALTER POLICY "muhaimin_main_admin_photo_delete"/);
  assert.match(migration, /ALTER POLICY "muhaimin_main_admin_photo_insert"/);
  assert.match(migration, /ALTER POLICY "muhaimin_main_admin_photo_read"/);
  assert.match(migration, /ALTER POLICY "muhaimin_main_admin_photo_update"/);
  assert.doesNotMatch(migration, /CREATE POLICY|DROP POLICY|DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test("all photo policies use the authenticated-executable private role helper", () => {
  const calls = migration.match(/private\.current_app_role\(\)/g) || [];
  assert.equal(calls.length, 5);
  assert.doesNotMatch(migration.replace(/^--.*$/gm, ""), /public\.current_app_role\(\)/);
});

test("photo bucket restrictions and Main Admin checks remain on every operation", () => {
  const blocks = migration.split(/ALTER POLICY /).slice(1);
  assert.equal(blocks.length, 4);
  for (const block of blocks) {
    assert.match(block, /muhaimin-farmer-photos/);
    assert.match(block, /muhaimin-branch-photos/);
    assert.match(block, /private\.current_app_role\(\) = 'main_admin'/);
  }
});

test("migration is transactional", () => {
  assert.match(migration, /^--[\s\S]*BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
});
