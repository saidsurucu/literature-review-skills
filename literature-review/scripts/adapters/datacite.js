(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // DataCite (api.datacite.org) — free, no key, CORS-open. DOIs for datasets,
  // software, theses, and other research outputs beyond journal articles.
  // See reference/datacite.md.
  const BASE = "https://api.datacite.org/dois";
  const PAGE = 25;
  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapDoi(d) {
    const at = (d && d.attributes) || {};
    const title = at.titles && at.titles[0] && at.titles[0].title;
    return LR.normalizeArticle({
      source: "datacite",
      title: title || null,
      authors: (at.creators || []).map((c) => c.name || [c.givenName, c.familyName].filter(Boolean).join(" ")).filter(Boolean),
      year: at.publicationYear || null,
      venue: at.publisher || null,
      doi: canon(at.doi),
      url: at.url || (at.doi ? "https://doi.org/" + at.doi : null),
      abstract: (at.descriptions && at.descriptions[0] && at.descriptions[0].description) || null,
      type: (at.types && (at.types.resourceTypeGeneral || at.types.resourceType)) || null,
      citationCount: typeof at.citationCount === "number" ? at.citationCount : null,
    });
  }
  function parse(j) { return { total: (j.meta && j.meta.total) || null, articles: (j.data || []).map(mapDoi) }; }
  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "?query=" + encodeURIComponent(p.query || "") + "&page[size]=" + PAGE + "&page[number]=" + (p.page || 1);
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const FMAP = { title: "titles.title", author: "creators.name", doi: "doi", publisher: "publisher", type: "types.resourceTypeGeneral" };
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const f = FMAP[c.field] || "titles.title";
      const frag = f + ':"' + c.term + '"';
      parts.push(i === 0 ? frag : (String(c.op || "AND").toUpperCase() + " " + frag));
    });
    let q = parts.join(" ");
    const tail = [];
    if (opts.firstYear) tail.push("created:>=" + opts.firstYear);
    if (opts.lastYear) tail.push("created:<=" + opts.lastYear + "-12-31");
    if (tail.length) q += (q ? " AND " : "") + tail.join(" AND ");
    return BASE + "?query=" + encodeURIComponent(q || "*") + "&page[size]=" + PAGE + "&page[number]=" + (opts.page || 1);
  }
  function advText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  async function search(args, ctx) {
    const r = parse(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "datacite", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parse(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advText(args.criteria), source: "datacite", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  const adapter = {
    source: "datacite", origin: "https://api.datacite.org", pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true },
    buildSearchUrl, buildAdvancedUrl, parse, mapDoi, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("datacite", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
