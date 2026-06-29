const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/crossref.js");
const CR = LR.get("crossref");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("buildSearchUrl hits /works with query + rows/offset + mailto", () => {
  const u = CR.buildSearchUrl({ query: "knowledge management", page: 2 });
  assert.ok(u.startsWith("https://api.crossref.org/works?"));
  assert.match(u, /query=knowledge%20management/);
  assert.match(u, /offset=20/);
  assert.match(u, /mailto=/);
});

test("buildAdvancedUrl maps fields to query.* params + date filter", () => {
  const u = CR.buildAdvancedUrl([
    { field: "title", term: "knowledge" },
    { field: "author", term: "Nonaka" },
  ], { firstYear: 2010, lastYear: 2020 });
  assert.match(u, /query\.title=knowledge/);
  assert.match(u, /query\.author=Nonaka/);
  assert.match(u, /filter=/);
  assert.match(u, /from-pub-date%3A2010-01-01|from-pub-date:2010-01-01/);
});

test("parseWorks maps items to normalized Articles (abstract de-JATSed, year from date-parts)", () => {
  const r = CR.parseWorks(fx("crossref-works.json"));
  assert.equal(r.total, 4917950);
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "crossref");
  assert.equal(a.title, "Knowledge Management and Knowledge Management Systems");
  assert.deepEqual(a.authors, ["Maryam Alavi", "Dorothy E. Leidner"]);
  assert.equal(a.year, 2001);
  assert.equal(a.venue, "MIS Quarterly");
  assert.equal(a.doi, "10.2307/3250961");
  assert.equal(a.citationCount, 9001);
  assert.equal(a.abstract, "Knowledge management systems overview.");
  assert.equal(a.pdfUrl, "https://example.org/oa/3250961.pdf");
});

test("extractReferences reads message.reference[] (unstructured or composed)", async () => {
  const ctx = { async fetchJson() { return fx("crossref-works.json"); } };
  // the single-work endpoint returns {message:{...}}; reuse the first item shape:
  const single = { message: fx("crossref-works.json").message.items[0] };
  const ctx2 = { async fetchJson() { return single; } };
  const r = await CR.extractReferences({ doi: "10.2307/3250961" }, ctx2);
  assert.equal(r.references.length, 2);
  assert.match(r.references[0].raw, /Nonaka/);
  assert.equal(r.references[0].doi, "10.1287/orsc.5.1.14");
  assert.match(r.references[1].raw, /Grant 1996/);
});

test("search op returns a normalized SearchResult via ctx", async () => {
  const ctx = { async fetchJson() { return fx("crossref-works.json"); } };
  const r = await CR.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "crossref");
  assert.equal(r.pagination.total, 4917950);
});
