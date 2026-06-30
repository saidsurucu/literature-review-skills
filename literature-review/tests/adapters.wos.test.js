const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/wos.js");
const WOS = LR.get("wos");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");
const fxj = (f) => JSON.parse(fx(f));

test("buildRows wraps free text as a single TS SearchRow", () => {
  assert.deepEqual(WOS.buildRows({ query: "graphene oxide" }), [{ rowField: "TS", rowText: "graphene oxide" }]);
});

test("buildRowsFromCriteria maps fields to tags + rowBoolean on later rows", () => {
  const rows = WOS.buildRowsFromCriteria([
    { field: "title", term: "graphene" }, { field: "author", term: "Geim", op: "OR" } ]);
  assert.deepEqual(rows, [
    { rowField: "TI", rowText: "graphene" },
    { rowBoolean: "OR", rowField: "AU", rowText: "Geim" } ]);
});

test("buildRunBody nests search.query and a retrieve block (WOSCC/general)", () => {
  const b = WOS.buildRunBody([{ rowField: "TS", rowText: "x" }], { count: 10, first: 1 });
  assert.equal(b.search.mode, "general");
  assert.equal(b.search.database, "WOSCC");
  assert.deepEqual(b.search.query, [{ rowField: "TS", rowText: "x" }]);
  assert.equal(b.retrieve.Count, 10);
  assert.equal(b.retrieve.Options.ReturnType, "List");
});

test("parseSearchInfo extracts QueryID and RecordsFound", () => {
  const info = WOS.parseSearchInfo(fxj("wos-runquery.json"));
  assert.equal(info.total, 17146);
  assert.equal(info.queryId, "d0649fd7-969d-4a83-8714-16ca413f760a-01bc3f9c36");
});

test("isChallenge detects passiveVerificationRequired", () => {
  assert.equal(WOS.isChallenge([{ id: 0, key: "error", payload: ["Server.passiveVerificationRequired"] }]), true);
  assert.equal(WOS.isChallenge(fxj("wos-runquery.json")), false);
});

test("parseResults extracts records from app-record rows", () => {
  const r = WOS.parseResults(fx("wos-search.html"));
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "wos");
  assert.equal(a.title, "Patent Citation Network Analysis: Topology and Evolution of Patent Citation Networks");
  assert.match(a.url, /\/full-record\/WOS:000389086300079$/);
  assert.deepEqual(a.authors, ["Erdi, P"]);
  assert.equal(a.year, "2016");
  assert.match(a.venue, /ARTIFICIAL NEURAL NETWORKS/);
});

function fakeCtx({ runResp, html }) {
  return {
    async fetchJson(url, opts) { this.lastUrl = url; this.lastBody = opts && opts.body; return runResp; },
    async pageHtml() { return html; },
  };
}

test("search returns DOM records with total from runQuerySearch", async () => {
  const ctx = fakeCtx({ runResp: fxj("wos-runquery.json"), html: fx("wos-search.html") });
  const r = await WOS.search({ query: "citation network analysis", sid: "EUW1ETEST" }, ctx);
  assert.match(ctx.lastUrl, /runQuerySearch\?SID=EUW1ETEST/);
  assert.match(ctx.lastBody, /"database":"WOSCC"/);
  assert.equal(r.source, "wos");
  assert.equal(r.articles.length, 2);
  assert.equal(r.pagination.total, 17146);
});

test("search surfaces passive verification as a challenge error", async () => {
  const ctx = fakeCtx({ runResp: [{ id: 0, key: "error", payload: ["Server.passiveVerificationRequired"] }], html: "" });
  const r = await WOS.search({ query: "x", sid: "S" }, ctx);
  assert.equal(r.error, "challenge");
});

test("search without a SID reports auth_required", async () => {
  const r = await WOS.search({ query: "x" }, fakeCtx({ runResp: [], html: "" }));
  assert.equal(r.error, "auth_required");
});
