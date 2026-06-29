const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/openalex.js");
const OA = LR.get("openalex");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("buildSearchUrl hits /works with search + paging + mailto", () => {
  const u = OA.buildSearchUrl({ query: "knowledge management", page: 2 });
  assert.ok(u.startsWith("https://api.openalex.org/works?"));
  assert.match(u, /search=knowledge%20management/);
  assert.match(u, /page=2/);
  assert.match(u, /mailto=/);
});

test("buildAdvancedUrl maps fields to filters + year range", () => {
  const u = OA.buildAdvancedUrl([
    { field: "title", term: "knowledge" },
    { field: "author", term: "Nonaka" },
  ], { firstYear: 2010, lastYear: 2020 });
  assert.match(u, /filter=/);
  assert.match(u, /title\.search%3Aknowledge|title\.search:knowledge/);
  assert.match(u, /from_publication_date%3A2010-01-01|from_publication_date:2010-01-01/);
});

test("parseWorks maps works to normalized Articles (HTML stripped, abstract inverted)", () => {
  const r = OA.parseWorks(fx("openalex-works.json"));
  assert.equal(r.total, 6629415);
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "openalex");
  assert.equal(a.title, "Review: Knowledge Management and Knowledge Management Systems");
  assert.deepEqual(a.authors, ["Maryam Alavi", "Dorothy E. Leidner"]);
  assert.equal(a.year, 2001);
  assert.equal(a.venue, "MIS Quarterly");
  assert.equal(a.doi, "10.2307/3250961");
  assert.equal(a.citationCount, 9001);
  assert.equal(a.pdfUrl, "https://example.org/oa/3250961.pdf");
  assert.equal(a.abstract, "Knowledge management systems");
  assert.equal(r.articles[1].doi, null);
});

test("search op returns a normalized SearchResult via ctx", async () => {
  const ctx = { async fetchJson() { return fx("openalex-works.json"); } };
  const r = await OA.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "openalex");
  assert.equal(r.pagination.total, 6629415);
  assert.equal(r.articles[0].venue, "MIS Quarterly");
});
