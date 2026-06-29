const { test } = require("node:test");
const assert = require("node:assert");
const LR = require("../scripts/lib.js");

function fakeCtx(map) {
  return { async fetchText(u) { return map[u]; }, async fetchJson(u) { return JSON.parse(map[u]); } };
}

test("run rejects unknown source and unsupported op", async () => {
  assert.equal((await LR.run("nope", "search", {})).error, "unknown_source");
  LR.register("capdemo", { capabilities: { search: true } });
  assert.equal((await LR.run("capdemo", "extractReferences", {})).error, "unsupported");
});

test("run dispatches to an adapter op method when present", async () => {
  LR.register("direct", { capabilities: { search: true }, async search() { return { ok: 1 }; } });
  assert.equal((await LR.run("direct", "search", {})).ok, 1);
});

test("run wraps a thrown HTTP error into a structured error (429 → rate_limited)", async () => {
  LR.register("boom", {
    capabilities: { search: true },
    async search() { const e = new Error("HTTP 429"); e.status = 429; throw e; },
  });
  const r = await LR.run("boom", "search", {}, { async fetchJson() {} });
  assert.equal(r.error, "rate_limited");
  assert.equal(r.status, 429);
});

test("run turns any other op failure into fetch_failed (no thrown exception)", async () => {
  LR.register("boom2", { capabilities: { search: true }, async search() { throw new Error("network down"); } });
  const r = await LR.run("boom2", "search", {}, {});
  assert.equal(r.error, "fetch_failed");
  assert.match(r.note, /network down/);
});

test("generic search pipeline builds url, fetches, parses, paginates", async () => {
  LR.register("dom", {
    source: "dom", pageSize: 2, capabilities: { search: true },
    buildSearchUrl: (a) => "u?q=" + a.query,
    parseResults: () => ({ articles: [{ source: "dom", title: "A" }], total: 9 }),
  });
  const ctx = fakeCtx({ "u?q=x": "<html></html>" });
  const r = await LR.run("dom", "search", { query: "x", page: 1 }, ctx);
  assert.equal(r.articles[0].title, "A");
  assert.equal(r.pagination.total, 9);
  assert.equal(r.pagination.hasNext, true);
});
