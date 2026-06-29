const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/arxiv.js");
const ARXIV = LR.get("arxiv");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl uses all: prefix + start/max_results", () => {
  const u = ARXIV.buildSearchUrl({ query: "knowledge management", page: 2 });
  assert.ok(u.startsWith("https://export.arxiv.org/api/query?"));
  assert.match(u, /search_query=all%3Aknowledge%20management/);
  assert.match(u, /start=25/);
  assert.match(u, /max_results=25/);
});

test("buildQuery maps fields to arXiv prefixes", () => {
  const q = ARXIV.buildQuery([
    { field: "title", term: "knowledge" },
    { field: "author", term: "Lovelace", op: "AND" },
  ]);
  assert.match(q, /ti:"knowledge"/);
  assert.match(q, /AND au:"Lovelace"/);
});

test("buildAdvancedUrl adds submittedDate range", () => {
  const u = ARXIV.buildAdvancedUrl([{ field: "title", term: "x" }], { firstYear: 2020, lastYear: 2024 });
  assert.match(decodeURIComponent(u), /submittedDate:\[20200101 TO 20241231\]/);
});

test("parseFeed maps Atom entries to normalized Articles", () => {
  const r = ARXIV.parseFeed(fx("arxiv-feed.xml"));
  assert.equal(r.total, 171039);
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "arxiv");
  assert.equal(a.title, "Imperfect Knowledge Management — A Case Study");
  assert.deepEqual(a.authors, ["Ada Lovelace", "Charles Babbage"]);
  assert.equal(a.year, "2025");
  assert.equal(a.venue, "arXiv (cs.DB)");
  assert.equal(a.pdfUrl, "https://arxiv.org/pdf/2502.01656v1");
  assert.equal(a.url, "http://arxiv.org/abs/2502.01656v1");
  assert.equal(r.articles[1].doi, "10.1000/xyz123");
});

test("search op returns normalized results via ctx", async () => {
  const ctx = { async fetchText() { return fx("arxiv-feed.xml"); } };
  const r = await ARXIV.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "arxiv");
  assert.equal(r.pagination.total, 171039);
});

test("extractReferences is unsupported (not in the arXiv API)", async () => {
  assert.equal((await LR.run("arxiv", "extractReferences", { id: "x" })).error, "unsupported");
});
