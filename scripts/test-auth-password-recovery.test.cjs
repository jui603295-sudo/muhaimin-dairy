"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

test("password recovery request redirects to the current TEST preview origin", () => {
  assert.match(html, /resetPasswordForEmail\(email,\s*\{\s*redirectTo:\s*location\.origin\s*\}\)/);
});

test("password recovery has a dedicated new-password and confirmation form", () => {
  assert.match(html, /id="passwordRecoveryPanel"/);
  assert.match(html, /id="newPassword"[^>]*minlength="8"/);
  assert.match(html, /id="confirmNewPassword"[^>]*minlength="8"/);
  assert.match(html, /id="saveNewPasswordBtn"/);
});

test("PASSWORD_RECOVERY event opens the password recovery panel", () => {
  assert.match(html, /onAuthStateChange\(\(event\)\s*=>\s*\{/);
  assert.match(html, /event\s*===\s*"PASSWORD_RECOVERY"/);
  assert.match(html, /passwordRecoveryFlow\s*=\s*true/);
  assert.match(html, /showPasswordRecoveryPanel\(\)/);
});

test("password update validates confirmation and calls Supabase updateUser", () => {
  assert.match(html, /newPassword\.length\s*<\s*8/);
  assert.match(html, /newPassword\s*!==\s*confirmPassword/);
  assert.match(html, /sb\.auth\.updateUser\(\{password:newPassword\}\)/);
});

test("recovery flow cannot enter the operational Main Admin workspace before password update", () => {
  assert.match(html, /if\(passwordRecoveryFlow\)\{showPasswordRecoveryPanel\(\);return;\}/);
  assert.match(html, /if\(passwordRecoveryFlow\)\{showPasswordRecoveryPanel\(\);return;\}[\s\S]*?Fail closed/);
});

test("successful password update clears the recovery URL fragment and local session", () => {
  assert.match(html, /sb\.auth\.signOut\(\{scope:"local"\}\)/);
  assert.match(html, /history\.replaceState\(null,document\.title,location\.pathname\+location\.search\)/);
});
