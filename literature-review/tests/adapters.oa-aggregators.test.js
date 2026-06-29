const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
["doaj", "datacite", "openlibrary", "hal", "unpaywall", "opencitations", "googlebooks", "core"]
  .forEach((s) => require("../scripts/adapters/" + s + ".js"));
const get = (s) => LR.get(s);
const fxText = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");
const fx = (f) => JSON.parse(fxText(f));
const jsonCtx = (file) => ({ async fetchJson() { return fx(file); } });

test("DOAJ: url, parse, search", async () => {
  const A = get("doaj");
  assert.match(A.buildSearchUrl({ query: "knowledge management", page: 2 }), /doaj\.org\/api\/search\/articles\/knowledge%20management\?pageSize=25&page=2/);
  const a = A.parse(fx("doaj-search.json")).articles[0];
  assert.equal(a.source, "doaj");
  assert.equal(a.venue, "Inventions");
  assert.equal(a.doi, "10.3390/inventions3040071");
  assert.match(a.pdfUrl, /\/pdf$/);
  const r = await A.search({ query: "knowledge management" }, jsonCtx("doaj-search.json"));
  assert.equal(r.pagination.total, 83159);
});

test("DataCite: parse maps datasets with resource type", async () => {
  const A = get("datacite");
  assert.match(A.buildSearchUrl({ query: "x" }), /api\.datacite\.org\/dois\?query=x/);
  const a = A.parse(fx("datacite-search.json")).articles[0];
  assert.equal(a.source, "datacite");
  assert.equal(a.type, "Dataset");
  assert.equal(a.year, 2026);
  assert.equal(a.doi, "10.17863/cam.130560");
  const r = await A.search({ query: "x" }, jsonCtx("datacite-search.json"));
  assert.equal(r.pagination.total, 125302);
});

test("OpenLibrary: parse maps books (work url + archive.org pdf)", async () => {
  const A = get("openlibrary");
  const a = A.parse(fx("openlibrary-search.json")).articles[0];
  assert.equal(a.source, "openlibrary");
  assert.equal(a.type, "book");
  assert.equal(a.year, 2003);
  assert.equal(a.url, "https://openlibrary.org/works/OL15697401W");
  assert.match(a.pdfUrl, /archive\.org\/details\//);
});

test("HAL: Solr parse with title_s/authFullName_s arrays", async () => {
  const A = get("hal");
  assert.match(A.buildSearchUrl({ query: "x" }), /api\.archives-ouvertes\.fr\/search\/\?q=x/);
  const a = A.parse(fx("hal-search.json")).articles[0];
  assert.equal(a.source, "hal");
  assert.equal(a.title, "The Influence of Knowledge Management");
  assert.deepEqual(a.authors, ["Marie Curie", "Henri Poincare"]);
  assert.equal(a.doi, "10.1000/hal123");
  assert.match(a.pdfUrl, /\/document$/);
});

test("Unpaywall: readFulltext resolves a DOI to an OA PDF; search is unsupported", async () => {
  const A = get("unpaywall");
  const r = await A.readFulltext({ doi: "10.1038/nature12373" }, jsonCtx("unpaywall-doi.json"));
  assert.equal(r.source, "unpaywall");
  assert.equal(r.isOA, true);
  assert.match(r.pdfUrl, /arxiv\.org\/pdf/);
  assert.equal((await LR.run("unpaywall", "search", { query: "x" })).error, "unsupported");
});

test("OpenCitations: extractReferences yields cited DOIs", async () => {
  const A = get("opencitations");
  const r = await A.extractReferences({ doi: "10.1108/13673279910275567" }, { async fetchJson() { return fx("opencitations-refs.json"); } });
  assert.equal(r.references.length, 2);
  assert.equal(r.references[0].doi, "10.1016/0263-2373(92)90062-9");
  assert.equal(r.references[0].year, "1992");
});

test("Google Books: parse + rate-limit handling", async () => {
  const A = get("googlebooks");
  const a = A.parse(fx("googlebooks-volumes.json")).articles[0];
  assert.equal(a.source, "googlebooks");
  assert.equal(a.title, "Working Knowledge: How Organizations Manage What They Know");
  assert.equal(a.year, "2000");
  assert.equal(a.venue, "Harvard Business Press");
  const rl = await A.search({ query: "x" }, { async fetchJson() { return { error: { message: "rateLimitExceeded" } }; } });
  assert.equal(rl.error, "rate_limited");
});

test("CORE: needs an API key, else auth_required; parses with shape", async () => {
  const A = get("core");
  assert.equal((await A.search({ query: "x" }, jsonCtx("core-works.json"))).error, "auth_required");
  const a = A.parse(fx("core-works.json")).articles[0];
  assert.equal(a.source, "core");
  assert.equal(a.doi, "10.1000/core123");
  assert.match(a.pdfUrl, /core\.ac\.uk\/download/);
  const r = await A.search({ query: "x", apiKey: "k" }, jsonCtx("core-works.json"));
  assert.equal(r.pagination.total, 540000);
});
