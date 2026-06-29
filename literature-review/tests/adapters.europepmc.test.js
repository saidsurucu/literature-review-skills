const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/europepmc.js");
const EPMC = LR.get("europepmc");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("buildSearchUrl hits /search with json + paging", () => {
  const u = EPMC.buildSearchUrl({ query: "knowledge management", page: 2 });
  assert.ok(u.startsWith("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"));
  assert.match(u, /query=knowledge%20management/);
  assert.match(u, /format=json/);
  assert.match(u, /page=2/);
});

test("buildQuery maps fields to EPMC syntax + PUB_YEAR range", () => {
  const q = EPMC.buildQuery([
    { field: "author", term: "Nonaka" },
    { field: "title", term: "knowledge", op: "AND" },
  ], { firstYear: 2010, lastYear: 2020 });
  assert.match(q, /AUTH:"Nonaka"/);
  assert.match(q, /TITLE:"knowledge"/);
  assert.match(q, /PUB_YEAR:\[2010 TO 2020\]/);
});

test("parseSearch maps results to normalized Articles", () => {
  const r = EPMC.parseSearch(fx("europepmc-search.json"));
  assert.equal(r.total, 1541578);
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "europepmc");
  assert.equal(a.title, "Knowledge management strategies and modern decision support");
  assert.deepEqual(a.authors, ["Smith J", "Jones K"]);
  assert.equal(a.year, "2026");
  assert.equal(a.venue, "BMC medical informatics and decision making");
  assert.equal(a.doi, "10.1186/s12911-026-03559-1");
  assert.equal(a.url, "https://europepmc.org/article/MED/40000001");
  assert.equal(a.abstract, "We review knowledge management strategies.");
  assert.equal(a.citationCount, 12);
});

test("search op returns a normalized SearchResult via ctx", async () => {
  const ctx = { async fetchJson() { return fx("europepmc-search.json"); } };
  const r = await EPMC.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "europepmc");
  assert.equal(r.pagination.total, 1541578);
  assert.equal(r.articles[1].url, "https://europepmc.org/article/PPR/PPR700000");
});
