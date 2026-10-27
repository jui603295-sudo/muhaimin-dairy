"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && body.trim());
const envScript = scripts.map(([, , body]) => body).find(body => body.includes("const MUHAIMIN_ENV ="));
const clientScript = scripts.map(([, , body]) => body).find(body => body.includes("const MUHAIMIN_TEST_CONFIG ="));
assert.ok(envScript, "Environment selector script must exist");
assert.ok(clientScript, "Supabase client configuration script must exist");
const clientSetup = clientScript.slice(0, clientScript.indexOf("const $ = id =>"));
assert.ok(clientSetup.includes("supabase.createClient"), "Client setup must create the Supabase client");

const PRODUCTION_URL = "https://hhqshslzoznwyprhjzia.supabase.co";
const PRODUCTION_KEY = "sb_publishable_Yv6oJdpTLriMOtzXoXbxGQ_h4AFAlQk";
function runCase(search, testConfig) {
  const createdClients = [];
  const body = { innerHTML: "" };
  const context = {
    URLSearchParams,
    window: { location: { search }, ...(testConfig === undefined ? {} : { MUHAIMIN_TEST_SUPABASE_CONFIG: testConfig }) },
    document: { body, write() {} },
    supabase: { createClient(url, key) { createdClients.push({ url, key }); return { url, key }; } },
    console
  };
  vm.createContext(context);
  vm.runInContext(envScript, context, { timeout: 1000 });
  let error = null;
  try { vm.runInContext(clientSetup, context, { timeout: 1000 }); }
  catch (e) { error = e; }
  return { createdClients, body, error };
}

const production = runCase("", undefined);
assert.equal(production.error, null, "Normal launch should not be blocked");
assert.deepEqual(production.createdClients, [{ url: PRODUCTION_URL, key: PRODUCTION_KEY }],
  "Normal launch should select the existing Production config");

const missing = runCase("?env=test", undefined);
assert.ok(missing.error && /TEST environment blocked/.test(missing.error.message),
  "TEST mode must fail closed when local TEST config is missing");
assert.equal(missing.createdClients.length, 0, "Missing TEST config must block client creation");

const sameUrl = runCase("?env=test", { url: PRODUCTION_URL, anonKey: "test-only-key" });
assert.ok(sameUrl.error && /TEST environment blocked/.test(sameUrl.error.message),
  "TEST mode must reject the Production URL");
assert.equal(sameUrl.createdClients.length, 0, "Production URL must never create a TEST client");

const sameKey = runCase("?env=test", { url: "https://muhaimin-isolated-test.supabase.co", anonKey: PRODUCTION_KEY });
assert.ok(sameKey.error && /TEST environment blocked/.test(sameKey.error.message),
  "TEST mode must reject the Production key");
assert.equal(sameKey.createdClients.length, 0, "Production key must never create a TEST client");

const malformedUrl = runCase("?env=test", { url: "http://localhost:54321", anonKey: "test-only-key" });
assert.ok(malformedUrl.error && /TEST environment blocked/.test(malformedUrl.error.message),
  "TEST mode must reject malformed/non-Supabase URLs");
assert.equal(malformedUrl.createdClients.length, 0, "Malformed TEST URL must block client creation");

const isolated = runCase("?env=test", { url: "https://muhaimin-isolated-test.supabase.co", anonKey: "test-only-key" });
assert.equal(isolated.error, null, "A distinct valid TEST config should be accepted");
assert.deepEqual(isolated.createdClients, [{ url: "https://muhaimin-isolated-test.supabase.co", key: "test-only-key" }],
  "TEST mode must create the client using only the TEST URL/key");

console.log("PASS: 6 runtime environment-isolation scenarios (Production selection, missing TEST config, Production URL rejection, Production key rejection, malformed URL rejection, isolated TEST selection).");
