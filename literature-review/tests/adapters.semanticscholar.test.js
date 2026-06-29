const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/semanticscholar.js");
const S2 = LR.get("semanticscholar");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("buildSearchUrl hits /paper/search with fields + offset + year", () => {
  const u = S2.buildSearchUrl({ query: "knowledge management", page: 2, firstYear: 2010, lastYear: 2020 });
  assert.ok(u.startsWith("https://api.semanticscholar.org/graph/v1/paper/search?"));
  assert.match(u, /query=knowledge%20management/);
  assert.match(u, /offset=25/);
  assert.match(u, /year=2010-2020/);
  assert.match(u, /fields=/);
});

test("parseSearch maps papers (prefers TLDR as abstract)", () => {
  const r = S2.parseSearch(fx("semanticscholar-search.json"));
  assert.equal(r.total, 248311);
  const a = r.articles[0];
  assert.equal(a.source, "semanticscholar");
  assert.equal(a.title, "Knowledge Management and Knowledge Management Systems");
  assert.deepEqual(a.authors, ["Maryam Alavi", "Dorothy E. Leidner"]);
  assert.equal(a.doi, "10.2307/3250961");
  assert.equal(a.citationCount, 9001);
  assert.equal(a.abstract, "KM systems support knowledge processes in organizations.");
  assert.equal(a.pdfUrl, "https://example.org/oa/3250961.pdf");
});

test("a rate-limited / dataless body becomes a structured error", async () => {
  const ctx = { async fetchJson() { return { message: "Too Many Requests" }; } };
  const r = await S2.search({ query: "x" }, ctx);
  assert.equal(r.error, "rate_limited");
  assert.equal(r.source, "semanticscholar");
});

test("search op returns a normalized SearchResult via ctx", async () => {
  const ctx = { async fetchJson() { return fx("semanticscholar-search.json"); } };
  const r = await S2.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "semanticscholar");
  assert.equal(r.pagination.total, 248311);
});
