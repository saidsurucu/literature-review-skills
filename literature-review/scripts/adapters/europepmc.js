(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Europe PMC (ebi.ac.uk/europepmc) — free, no key, CORS-open. Broader than
  // PubMed (preprints, patents, agricola). JSON REST. References + OA full text.
  // See reference/europepmc.md.
  const BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";
  const PAGE = 25;

  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapResult(x) {
    const ji = x.journalInfo || {};
    return LR.normalizeArticle({
      source: "europepmc",
      title: x.title ? String(x.title).replace(/\.$/, "") : null,
      authors: x.authorString ? String(x.authorString).replace(/\.$/, "").split(/,\s*/).filter(Boolean) : [],
      year: x.pubYear || null,
      venue: (ji.journal && ji.journal.title) || x.bookOrReportDetails && x.bookOrReportDetails.publisher || null,
      doi: canon(x.doi),
      url: (x.source && x.id) ? "https://europepmc.org/article/" + x.source + "/" + x.id : (x.doi ? "https://doi.org/" + x.doi : null),
      abstract: x.abstractText ? String(x.abstractText).replace(/<[^>]+>/g, "").trim() : null,
      type: x.pubType || null,
      citationCount: typeof x.citedByCount === "number" ? x.citedByCount : null,
    });
  }
  function parseSearch(j) {
    return { total: typeof j.hitCount === "number" ? j.hitCount : null, articles: ((j.resultList && j.resultList.result) || []).map(mapResult) };
  }

  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "/search?query=" + encodeURIComponent(p.query || "") + "&format=json&resultType=core&pageSize=" + PAGE + "&page=" + (p.page || 1);
  }
  const FMAP = { author: "AUTH", title: "TITLE", journal: "JOURNAL", venue: "JOURNAL", abstract: "ABSTRACT", doi: "DOI" };
  function buildQuery(criteria, opts) {
    const parts = [];
    (criteria || []).forEach((c) => {
      if (!c || !c.term) return;
      const f = FMAP[c.field];
      const frag = f ? f + ':"' + c.term + '"' : c.term;
      parts.push(parts.length ? (String(c.op || "AND").toUpperCase() + " " + frag) : frag);
    });
    let q = parts.join(" ");
    if (opts && (opts.firstYear || opts.lastYear)) {
      const range = "PUB_YEAR:[" + (opts.firstYear || "1500") + " TO " + (opts.lastYear || "3000") + "]";
      q = q ? q + " AND " + range : range;
    }
    return q;
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    return BASE + "/search?query=" + encodeURIComponent(buildQuery(criteria, opts)) + "&format=json&resultType=core&pageSize=" + PAGE + "&page=" + (opts.page || 1);
  }

  async function search(args, ctx) {
    const r = parseSearch(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "europepmc", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parseSearch(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: buildQuery(args.criteria, args), source: "europepmc", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  function refSourceId(args) {
    // accept {source,id} or {id:"MED/123"} or a bare id (defaults to MED)
    if (args.source && args.id) return args.source + "/" + args.id;
    if (args.id && /\//.test(args.id)) return args.id;
    return "MED/" + (args.id || args.pmid || "");
  }
  async function extractReferences(args, ctx) {
    const j = await ctx.fetchJson(BASE + "/" + refSourceId(args) + "/references?format=json&pageSize=100");
    const list = (j.referenceList && j.referenceList.reference) || [];
    const refs = list.map((r) => ({
      raw: [r.authorString, r.pubYear, r.title, r.journalAbbreviation].filter(Boolean).join(" ") || (r.id || ""),
      doi: canon(r.doi), title: r.title || null, year: r.pubYear || null, authors: null, url: null,
    }));
    return { source: "europepmc", references: refs };
  }
  async function readFulltext(args, ctx) {
    const sid = refSourceId(args);
    // Open-access full text is served as XML; expose its URL for the caller.
    const url = BASE + "/" + sid + "/fullTextXML";
    const txt = await ctx.fetchText(url);
    if (!txt || /<error|not found|no fulltext/i.test(txt.slice(0, 200))) return { error: "no_fulltext", source: "europepmc", note: "no open-access full text" };
    return { source: "europepmc", fullTextXmlUrl: url, length: txt.length };
  }

  const adapter = {
    source: "europepmc", origin: BASE, pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    buildSearchUrl, buildAdvancedUrl, buildQuery, parseSearch, mapResult,
    search, advancedSearch, extractReferences, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("europepmc", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
