const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/pubmed.js");
require("../scripts/adapters/emerald.js");
require("../scripts/adapters/brill.js");
require("../scripts/adapters/tandf.js");
require("../scripts/adapters/wiley.js");
require("../scripts/adapters/scholar.js");
require("../scripts/adapters/tandfbooks.js");
require("../scripts/adapters/openalex.js");
require("../scripts/adapters/crossref.js");
require("../scripts/adapters/europepmc.js");
require("../scripts/adapters/semanticscholar.js");
require("../scripts/adapters/arxiv.js");
require("../scripts/adapters/biorxiv.js");

const OPS = ["search", "advancedSearch", "readFulltext", "extractReferences"];
const SOURCES = ["pubmed", "emerald", "brill", "tandf", "wiley", "scholar", "tandfbooks", "openalex", "crossref", "europepmc", "semanticscholar", "arxiv", "biorxiv"];

test("every adapter registers, declares capabilities, and has op methods or pipelines", () => {
  SOURCES.forEach((s) => {
    const a = LR.get(s);
    assert.ok(a, s + " registered");
    OPS.forEach((op) => {
      const supported = !!(a.capabilities && a.capabilities[op]);
      if (supported) {
        const hasMethod = typeof a[op] === "function";
        const hasPipeline = typeof LR.pipelines[op] === "function" && typeof a.buildSearchUrl === "function";
        assert.ok(hasMethod || hasPipeline, s + " supports " + op + " but exposes no method/pipeline");
      }
    });
  });
});

test("SKILL.md description names every v1 source and lists the capability matrix", () => {
  const md = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
  ["PubMed", "Emerald", "Scopus", "Web of Science", "Google Scholar", "Wiley", "Taylor", "Brill"].forEach((name) => {
    assert.ok(md.includes(name), "SKILL.md must mention " + name);
  });
  assert.match(md, /capability matrix/i);
  assert.ok(md.includes("https://eutils.ncbi.nlm.nih.gov"), "must document exact PubMed origin");
});

test("each adapter reference doc exists and records the home origin", () => {
  const pm = fs.readFileSync(path.join(root, "reference", "pubmed.md"), "utf8");
  const em = fs.readFileSync(path.join(root, "reference", "emerald.md"), "utf8");
  const br = fs.readFileSync(path.join(root, "reference", "brill.md"), "utf8");
  const tf = fs.readFileSync(path.join(root, "reference", "tandf.md"), "utf8");
  const wl = fs.readFileSync(path.join(root, "reference", "wiley.md"), "utf8");
  const gs = fs.readFileSync(path.join(root, "reference", "scholar.md"), "utf8");
  const tb = fs.readFileSync(path.join(root, "reference", "tandfbooks.md"), "utf8");
  const oa = fs.readFileSync(path.join(root, "reference", "openalex.md"), "utf8");
  const cr = fs.readFileSync(path.join(root, "reference", "crossref.md"), "utf8");
  assert.ok(tb.includes("https://www.taylorfrancis.com"));
  assert.ok(oa.includes("https://api.openalex.org"));
  assert.ok(cr.includes("https://api.crossref.org"));
  assert.ok(fs.readFileSync(path.join(root, "reference", "europepmc.md"), "utf8").includes("ebi.ac.uk/europepmc"));
  assert.ok(fs.readFileSync(path.join(root, "reference", "semanticscholar.md"), "utf8").includes("api.semanticscholar.org"));
  assert.ok(fs.readFileSync(path.join(root, "reference", "arxiv.md"), "utf8").includes("export.arxiv.org"));
  assert.ok(fs.readFileSync(path.join(root, "reference", "biorxiv.md"), "utf8").includes("bioRxiv"));
  assert.ok(pm.includes("https://eutils.ncbi.nlm.nih.gov"));
  assert.ok(em.includes("https://www.emerald.com"));
  assert.ok(br.includes("https://brill.com"));
  assert.ok(tf.includes("https://www.tandfonline.com"));
  assert.ok(wl.includes("https://onlinelibrary.wiley.com"));
  assert.ok(gs.includes("https://scholar.google.com"));
});

test("committed HTML/JSON fixtures carry provenance", () => {
  const dir = path.join(__dirname, "fixtures");
  fs.readdirSync(dir).forEach((f) => {
    const txt = fs.readFileSync(path.join(dir, f), "utf8");
    assert.match(txt, /provenance|captured/i, f + " missing provenance header");
  });
});
