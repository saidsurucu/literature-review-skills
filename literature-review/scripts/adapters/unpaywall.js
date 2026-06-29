(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Unpaywall (api.unpaywall.org) — free, CORS-open, requires an email param. NOT a
  // search source: it resolves a DOI to an open-access PDF. So it exposes only
  // readFulltext — a cross-source OA fallback for any DOI. See reference/unpaywall.md.
  const BASE = "https://api.unpaywall.org/v2/";
  const EMAIL = "literature-review-skill@example.org";
  function clean(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  async function readFulltext(args, ctx) {
    const doi = clean(args.doi || args.id);
    if (!doi) return { error: "bad_request", source: "unpaywall", note: "pass a DOI" };
    const j = await ctx.fetchJson(BASE + encodeURIComponent(doi) + "?email=" + encodeURIComponent(args.email || EMAIL));
    if (!j || j.error) return { error: "not_found", source: "unpaywall", note: (j && j.message) || "DOI not in Unpaywall" };
    const best = j.best_oa_location || null;
    if (!j.is_oa || !best) return { error: "no_fulltext", source: "unpaywall", note: "not open access" };
    return { source: "unpaywall", doi: doi, isOA: true, pdfUrl: best.url_for_pdf || best.url || null, hostType: best.host_type || null, version: best.version || null };
  }
  const adapter = {
    source: "unpaywall", origin: "https://api.unpaywall.org", corsOpen: true,
    capabilities: { readFulltext: true }, // not a search source
    readFulltext: readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("unpaywall", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
