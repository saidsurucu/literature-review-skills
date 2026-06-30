const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/scopus.js");
const SC = LR.get("scopus");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("buildQuery wraps free text in TITLE-ABS-KEY", () => {
  assert.equal(SC.buildQuery("citation network analysis"), "TITLE-ABS-KEY(citation network analysis)");
});

test("buildBody sets offset/limit from page and a flat query", () => {
  const b = SC.buildBody({ query: "TITLE-ABS-KEY(x)", page: 3 });
  assert.equal(b.query, "TITLE-ABS-KEY(x)");
  assert.equal(b.searchSettings.limit, 25);
  assert.equal(b.searchSettings.offset, 50);
  assert.equal(b.documentType, "s");
});

test("buildAdvancedQuery maps fields to Scopus operators with booleans + year range", () => {
  const q = SC.buildAdvancedQuery(
    [ { field: "title", term: "graphene" }, { field: "author", term: "Geim", op: "AND" } ],
    { firstYear: 2015, lastYear: 2020 }
  );
  assert.match(q, /TITLE\(graphene\)/);
  assert.match(q, /AND AUTH\(Geim\)/);
  assert.match(q, /PUBYEAR > 2014/);
  assert.match(q, /PUBYEAR < 2021/);
});

test("parseSearch maps items to normalized Articles", () => {
  const r = SC.parseSearch(fx("scopus-search.json"));
  assert.equal(r.total, 13679);
  assert.equal(r.articles.length, 1);
  const a = r.articles[0];
  assert.equal(a.source, "scopus");
  assert.equal(a.title, "Charting the Digital Frontier: A Comprehensive Bibliometric Analysis of E-Agriculture Research");
  assert.deepEqual(a.authors, ["Boshnjaku A.", "Plasari E.", "Fata I."]);
  assert.equal(a.year, 2026);
  assert.equal(a.venue, "International Journal of Innovative Technology and Interdisciplinary Sciences");
  assert.equal(a.doi, "10.15157/ijitis.2026.9.1.51-114");
  assert.equal(a.citationCount, 1);
  assert.match(a.url, /105030833937/);
  assert.match(a.abstract, /bibliometric analysis of e-agriculture/);
});

test("search posts the gateway body and returns paginated results", async () => {
  let captured = null;
  const ctx = { async fetchJson(url, opts) { captured = { url, opts }; return fx("scopus-search.json"); } };
  const r = await SC.search({ query: "citation network analysis", page: 1 }, ctx);
  assert.match(captured.url, /\/gateway\/documents\/search$/);
  assert.equal(captured.opts.method, "POST");
  assert.match(captured.opts.body, /TITLE-ABS-KEY\(citation network analysis\)/);
  assert.equal(r.source, "scopus");
  assert.equal(r.articles.length, 1);
  assert.equal(r.pagination.total, 13679);
  assert.equal(r.pagination.hasNext, true);
});

test("advancedSearch posts a composed query string", async () => {
  let body = null;
  const ctx = { async fetchJson(url, opts) { body = opts.body; return fx("scopus-search.json"); } };
  await SC.advancedSearch({ criteria: [{ field: "title", term: "graphene" }], firstYear: 2015 }, ctx);
  assert.match(body, /TITLE\(graphene\)/);
  assert.match(body, /PUBYEAR > 2014/);
});

test("readFulltext returns a publisher link-out from eid", async () => {
  const r = await SC.readFulltext({ eid: "2-s2.0-105030833937" }, {});
  assert.match(r.pdfUrl, /eid=2-s2\.0-105030833937/);
});

test("readFulltext falls back to a DOI link-out", async () => {
  const r = await SC.readFulltext({ doi: "10.1/x" }, {});
  assert.match(r.pdfUrl, /doi\.org\/10\.1\/x/);
});

test("readFulltext with neither eid nor doi reports no_fulltext", async () => {
  const r = await SC.readFulltext({}, {});
  assert.equal(r.error, "no_fulltext");
});
