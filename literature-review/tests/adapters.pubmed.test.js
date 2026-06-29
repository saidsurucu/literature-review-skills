const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/pubmed.js");
const PUBMED = LR.get("pubmed");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildEsearchUrl targets eutils host with required params", () => {
  const u = PUBMED.buildEsearchUrl({ term: "crispr", page: 2, pageSize: 20 });
  assert.ok(u.startsWith("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"));
  assert.match(u, /db=pubmed/);
  assert.match(u, /retmode=json/);
  assert.match(u, /retstart=20/);
  assert.match(u, /retmax=20/);
  assert.match(u, /term=crispr/);
  assert.match(u, /tool=literature-review/);
  assert.match(u, /email=/);
});

test("parseEsearch returns total + ids", () => {
  const r = PUBMED.parseEsearch(JSON.parse(fx("pubmed-esearch.json")));
  assert.equal(r.total, 123);
  assert.deepEqual(r.ids, ["40000001", "40000002"]);
});

test("parseEsummary maps uids to normalized articles", () => {
  const arts = PUBMED.parseEsummary(JSON.parse(fx("pubmed-esummary.json")));
  assert.equal(arts.length, 1);
  const a = arts[0];
  assert.equal(a.source, "pubmed");
  assert.equal(a.title, "A CRISPR Study");
  assert.deepEqual(a.authors, ["Lovelace A", "Babbage C"]);
  assert.equal(a.year, "2024");
  assert.equal(a.venue, "Journal of Tests");
  assert.equal(a.doi, "10.1234/abc");
  assert.equal(a.url, "https://pubmed.ncbi.nlm.nih.gov/40000001/");
});
