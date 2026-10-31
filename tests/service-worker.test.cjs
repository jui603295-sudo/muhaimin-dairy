const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("sw.js", "utf8");
const ORIGIN = "https://muhaimin.test";

function makeHarness({ missing = [], networkOffline = false } = {}) {
  const store = new Map();
  const listeners = new Map();
  let skipWaitingCalls = 0;
  let claimCalls = 0;
  let networkCalls = 0;

  const normalize = value => {
    const raw = typeof value === "string" ? value : value.url;
    return new URL(raw, ORIGIN + "/").href;
  };
  const makeResponse = (body, ok = true) => ({
    body, ok,
    clone() { return makeResponse(body, ok); }
  });
  const networkFetch = async request => {
    networkCalls++;
    const url = normalize(request);
    const pathname = new URL(url).pathname;
    if (networkOffline || missing.includes(pathname) || missing.includes(url)) {
      throw new Error("network unavailable: " + pathname);
    }
    return makeResponse("network:" + pathname);
  };
  const caches = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const bucket = store.get(name);
      return {
        async add(path) {
          const response = await networkFetch(path);
          if (!response.ok) throw new Error("non-OK response");
          bucket.set(normalize(path), response);
        },
        async addAll(paths) {
          // Cache.addAll rejects as a unit if any required resource fails.
          const fetched = await Promise.all(paths.map(async path => {
            const response = await networkFetch(path);
            if (!response.ok) throw new Error("non-OK response");
            return [normalize(path), response];
          }));
          for (const [key, response] of fetched) bucket.set(key, response);
        },
        async put(request, response) { bucket.set(normalize(request), response); },
        async match(request) { return bucket.get(normalize(request)); }
      };
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
    async match(request) {
      const key = normalize(request);
      for (const bucket of store.values()) {
        if (bucket.has(key)) return bucket.get(key);
      }
      return undefined;
    }
  };

  const self = {
    location: { origin: ORIGIN },
    clients: { async claim() { claimCalls++; } },
    addEventListener(type, handler) { listeners.set(type, handler); },
    async skipWaiting() { skipWaitingCalls++; }
  };
  const context = {
    self, caches, fetch: networkFetch, URL,
    Response: { error: () => makeResponse("network-error", false) },
    Promise, console
  };
  vm.runInNewContext(source, context, { filename: "sw.js" });

  async function dispatch(type, event = {}) {
    const handler = listeners.get(type);
    assert.ok(handler, "Service Worker must register " + type + " handler");
    let pending;
    event.waitUntil = promise => { pending = promise; };
    handler(event);
    if (pending) await pending;
    return event;
  }
  return {
    store, caches, dispatch,
    get skipWaitingCalls() { return skipWaitingCalls; },
    get claimCalls() { return claimCalls; },
    get networkCalls() { return networkCalls; },
    makeResponse
  };
}

test("required app shell failure prevents installation and skipWaiting", async () => {
  const h = makeHarness({ missing: ["/data/bangladesh-address.json"] });
  await assert.rejects(h.dispatch("install"));
  assert.equal(h.skipWaitingCalls, 0);
  assert.ok(h.store.has("muhaimin-v6"));
});

test("missing optional presentation assets do not block installation", async () => {
  const h = makeHarness({
    missing: ["/manifest.json", "/muhaimin-logo.png", "/assets/milk-collection-3d.svg"]
  });
  await h.dispatch("install");
  assert.equal(h.skipWaitingCalls, 1);
  const cache = h.store.get("muhaimin-v6");
  assert.ok(cache.has(ORIGIN + "/index.html"));
  assert.ok(cache.has(ORIGIN + "/data/bangladesh-address.json"));
  assert.ok(!cache.has(ORIGIN + "/manifest.json"));
});

test("activation removes older Muhaimin caches and claims clients", async () => {
  const h = makeHarness();
  h.store.set("muhaimin-v5", new Map());
  h.store.set("unrelated-cache", new Map());
  h.store.set("muhaimin-v6", new Map());
  await h.dispatch("activate");
  assert.deepEqual([...h.store.keys()].sort(), ["muhaimin-v6", "unrelated-cache"]);
  assert.equal(h.claimCalls, 1);
});

test("cached Farmer address JSON is served before network", async () => {
  const h = makeHarness();
  const cache = await h.caches.open("muhaimin-v6");
  await cache.put("./data/bangladesh-address.json", h.makeResponse("cached-address-tree"));
  const event = {
    request: {
      url: ORIGIN + "/data/bangladesh-address.json",
      method: "GET",
      mode: "cors"
    }
  };
  await h.dispatch("fetch", event);
  const response = await event.responsePromise;
  assert.equal(response.body, "cached-address-tree");
  assert.equal(h.networkCalls, 0);
});
