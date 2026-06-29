(function (root, factory) {
  const api = factory();
  api.__install = function (target) {
    if (target.__LR && target.__LR._adapters) {
      // Merge prior registrations into this instance (whose closures read
      // api._adapters), then take over the global. Preserves the registry
      // across re-injection without leaving stale closures behind.
      Object.assign(api._adapters, target.__LR._adapters);
    }
    target.__LR = api;
    return target.__LR;
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  api.__install(root);
  return api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const _adapters = Object.create(null);
  function register(source, adapter) {
    adapter.source = adapter.source || source;
    _adapters[source] = adapter;
    return adapter;
  }
  function get(source) { return _adapters[source] || null; }

  const ARTICLE_FIELDS = ["source", "title", "authors", "year", "venue", "doi", "url", "abstract", "type", "citationCount", "pdfUrl"];
  function normalizeArticle(raw) {
    raw = raw || {};
    const a = {};
    ARTICLE_FIELDS.forEach((f) => {
      if (f === "authors") a.authors = Array.isArray(raw.authors) ? raw.authors : [];
      else a[f] = raw[f] == null ? null : raw[f];
    });
    return a;
  }
  function makeSearchResult(p) {
    p = p || {};
    const articles = (p.articles || []).map(normalizeArticle);
    let hasNext;
    if (p.total == null) hasNext = articles.length >= (p.pageSize || articles.length);
    else hasNext = (p.page || 1) * (p.pageSize || articles.length) < p.total;
    return { query: p.query, source: p.source, pagination: { page: p.page || 1, total: p.total == null ? null : p.total, hasNext: !!hasNext }, articles };
  }

  function canonicalDoi(s) {
    if (!s) return null;
    let d = String(s).trim().toLowerCase();
    d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:/, "");
    return d || null;
  }
  function normalizeTitle(s) {
    if (!s) return "";
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function dedupeArticles(articles) {
    const byKey = new Map();
    const order = [];
    let anon = 0;
    (articles || []).forEach((art) => {
      const nt = normalizeTitle(art.title);
      // Records with neither a DOI nor a usable title must NOT collapse together —
      // give each its own key instead of merging all untitled records into one.
      const key = canonicalDoi(art.doi) || (nt ? "t:" + nt : "anon:" + (anon++));
      if (!byKey.has(key)) {
        const copy = Object.assign({}, art, { sources: [art.source].filter(Boolean) });
        byKey.set(key, copy); order.push(key);
      } else {
        const cur = byKey.get(key);
        Object.keys(art).forEach((f) => { if (cur[f] == null && art[f] != null) cur[f] = art[f]; });
        if (art.source && cur.sources.indexOf(art.source) === -1) cur.sources.push(art.source);
      }
    });
    return order.map((k) => byKey.get(k));
  }

  function httpCheck(r, url) {
    if (r.ok) return r;
    const e = new Error("HTTP " + r.status + " for " + url);
    e.status = r.status;
    throw e; // 429/403/5xx/login walls surface as a structured error (see run())
  }
  function makeBrowserCtx() {
    return {
      async fetchText(url, opts) { return httpCheck(await fetch(url, opts), url).text(); },
      async fetchJson(url, opts) { return httpCheck(await fetch(url, opts), url).json(); },
      // For client-rendered search pages: the live DOM after navigate+render. Guards
      // against answering a stale/wrong page — if the tab isn't on the expected
      // search path, throw so the recipe navigates first instead of returning
      // results for whatever happens to be loaded.
      async pageHtml(expectedUrl) {
        if (typeof document === "undefined") return "";
        if (expectedUrl) {
          try {
            const cur = new URL(location.href).pathname;
            const want = new URL(expectedUrl, location.href).pathname;
            if (cur !== want) { const e = new Error("tab is on " + location.href + " — navigate to " + expectedUrl + " first"); e.status = 0; throw e; }
          } catch (err) { if (err && err.status === 0) throw err; }
        }
        return document.documentElement.outerHTML;
      },
    };
  }
  const pipelines = {
    async search(a, args, ctx) {
      const html = await ctx.fetchText(a.buildSearchUrl(args));
      const res = a.parseResults(html, args);
      return makeSearchResult({ query: args.query, source: a.source, page: args.page || 1, pageSize: a.pageSize, total: res.total, articles: res.articles });
    },
    async advancedSearch(a, args, ctx) {
      const html = await ctx.fetchText(a.buildAdvancedUrl(args.criteria, args));
      const res = a.parseResults(html, args);
      return makeSearchResult({ query: a.buildAdvancedQuery(args.criteria, args), source: a.source, page: args.page || 1, pageSize: a.pageSize, total: res.total, articles: res.articles });
    },
    async extractReferences(a, args, ctx) {
      const html = await ctx.fetchText(args.url);
      return { source: a.source, url: args.url, references: a.parseReferences(html) };
    },
    async readFulltext(a, args, ctx) {
      const pdfUrl = await a.locateFulltext(args, ctx);
      if (!pdfUrl) return { error: "no_fulltext", source: a.source, note: "subscription/login required" };
      return { source: a.source, pdfUrl };
    },
  };
  async function run(source, op, args, ctx) {
    const a = get(source);
    if (!a) return { error: "unknown_source", source };
    if (!a.capabilities || !a.capabilities[op]) return { error: "unsupported", source, op };
    ctx = ctx || makeBrowserCtx();
    try {
      if (typeof a[op] === "function") return await a[op](args || {}, ctx);
      if (pipelines[op]) return await pipelines[op](a, args || {}, ctx);
      return { error: "unsupported", source, op };
    } catch (e) {
      // 429 → rate_limited; navigate-mismatch (status 0) and any fetch/parse
      // failure → a structured error instead of a thrown exception or silent empty.
      const status = e && e.status;
      const kind = status === 429 ? "rate_limited" : (status === 0 ? "dom_mismatch" : "fetch_failed");
      return { error: kind, source, op, status: status == null ? null : status, note: String((e && e.message) || e) };
    }
  }

  async function mapPool(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) { const i = next++; try { results[i] = await fn(items[i], i); } catch (e) { results[i] = null; } }
    }
    const n = Math.max(1, Math.min(limit, items.length || 1));
    await Promise.all(Array.from({ length: n }, worker));
    return results;
  }

  // ---- Shared publisher (Highwire citation_* meta) tooling ----
  function parseDocHtml(html) { return new DOMParser().parseFromString(html || "", "text/html"); }
  function metaAll(doc, name) {
    return Array.prototype.map.call(doc.querySelectorAll('meta[name="' + name + '"]'), (e) => (e.getAttribute("content") || "").trim()).filter(Boolean);
  }
  // Case-insensitive meta lookup (Dublin Core casing varies: dc.Title / DC.Title / dc.title).
  function metaCI(doc, nameLower) {
    const out = [];
    Array.prototype.forEach.call(doc.querySelectorAll("meta[name]"), (e) => {
      if ((e.getAttribute("name") || "").toLowerCase() === nameLower) {
        const c = (e.getAttribute("content") || "").trim();
        if (c) out.push(c);
      }
    });
    return out;
  }
  function dcDoi(doc) {
    let found = null;
    Array.prototype.forEach.call(doc.querySelectorAll("meta[name]"), (e) => {
      if (found) return;
      if ((e.getAttribute("name") || "").toLowerCase() === "dc.identifier" && (e.getAttribute("scheme") || "").toLowerCase() === "doi") {
        found = (e.getAttribute("content") || "").trim() || null;
      }
    });
    return found;
  }
  function yearFromMeta(doc, doi) {
    const date = metaAll(doc, "citation_publication_date")[0] || metaAll(doc, "citation_date")[0] ||
      metaAll(doc, "citation_online_date")[0] || metaAll(doc, "citation_year")[0] || "";
    const ym = /(\d{4})/.exec(date);
    if (ym) return ym[1];
    const dm = /(20\d{2}|19\d{2})/.exec(doi || ""); // some publishers (Emerald) embed the year in the DOI
    return dm ? dm[1] : null;
  }
  function parseHighwireArticle(html, source) {
    const doc = parseDocHtml(html);
    const doi = metaAll(doc, "citation_doi")[0] || null;
    return normalizeArticle({
      source: source,
      title: metaAll(doc, "citation_title")[0] || null,
      authors: metaAll(doc, "citation_author"),
      year: yearFromMeta(doc, doi),
      venue: metaAll(doc, "citation_journal_title")[0] || null,
      doi: doi,
      url: metaAll(doc, "citation_abstract_html_url")[0] || metaAll(doc, "citation_fulltext_html_url")[0] || null,
      pdfUrl: metaAll(doc, "citation_pdf_url")[0] || null,
      abstract: metaAll(doc, "citation_abstract")[0] || null,
    });
  }
  function parseDublinCoreArticle(html, source, opts) {
    opts = opts || {};
    const doc = parseDocHtml(html);
    // Only accept the DOI-schemed identifier; never fall back to publisher-id/submission-id.
    // Case-insensitive throughout (dc.* casing varies across Atypon tenants).
    const doi = dcDoi(doc);
    const dt = metaCI(doc, "dc.date")[0] || "";
    const ym = /(\d{4})/.exec(dt) || /(20\d{2}|19\d{2})/.exec(doi || "");
    function fill(t) { return t && doi ? t.replace("{doi}", doi) : null; }
    return normalizeArticle({
      source: source,
      title: metaCI(doc, "dc.title")[0] || null,
      authors: metaCI(doc, "dc.creator").map((s) => s.replace(/\s+/g, " ").trim()),
      year: ym ? ym[1] : null,
      venue: metaCI(doc, "citation_journal_title")[0] || metaCI(doc, "dc.source")[0] || null,
      doi: doi,
      url: fill(opts.urlTemplate),
      pdfUrl: fill(opts.pdfTemplate),
      abstract: metaCI(doc, "dc.description")[0] || null,
    });
  }
  function harvestHrefs(html, origin, matchRe) {
    const doc = parseDocHtml(html);
    const seen = []; const out = [];
    doc.querySelectorAll("a[href]").forEach((a) => {
      let href = a.getAttribute("href") || "";
      if (!matchRe.test(href)) return;
      if (href.indexOf("http") !== 0) href = origin + href;
      href = href.split("#")[0].split("?")[0];
      if (seen.indexOf(href) === -1) { seen.push(href); out.push(href); }
    });
    return out;
  }
  function parseHighwireReferences(html, refSelectors) {
    const doc = parseDocHtml(html);
    const metas = metaAll(doc, "citation_reference");
    if (metas.length) return metas.map((r) => ({ raw: r, title: null, authors: null, year: null, doi: null, url: null }));
    const out = [];
    (refSelectors || []).forEach((sel) => {
      if (out.length) return;
      doc.querySelectorAll(sel).forEach((li) => {
        const raw = (li.textContent || "").replace(/\s+/g, " ").trim();
        if (raw) out.push({ raw: raw, title: null, authors: null, year: null, doi: null, url: null });
      });
    });
    return out;
  }
  function normOp(op) { const s = String(op == null ? "AND" : op).toUpperCase(); return (s === "OR" || s === "NOT") ? s : "AND"; }
  // Build a complete publisher adapter (Emerald/Brill/T&F/Wiley share this shape).
  function makePublisherAdapter(cfg) {
    const origin = cfg.origin, pageSize = cfg.pageSize || 10, source = cfg.source;
    function buildSearchUrl(p) {
      p = p || {};
      const parts = [cfg.queryParam + "=" + encodeURIComponent(p.query || "")];
      if (p.page && Number(p.page) > 1 && cfg.pageParam) parts.push(cfg.pageParam + "=" + encodeURIComponent(p.page));
      return origin + cfg.searchPath + "?" + parts.join("&");
    }
    function buildAdvancedQuery(criteria, opts) {
      const parts = [];
      (criteria || []).forEach((c, i) => {
        if (!c || !c.term) return;
        const f = (cfg.fields && cfg.fields[c.field]) || c.field;
        const frag = f + ":(" + c.term + ")";
        parts.push(i === 0 ? frag : normOp(c.op) + " " + frag);
      });
      let q = parts.join(" ");
      if (opts && (opts.firstYear || opts.lastYear)) q += " " + (opts.firstYear || "") + "-" + (opts.lastYear || "");
      return q.trim();
    }
    function buildAdvancedUrl(criteria, opts) {
      const parts = [cfg.queryParam + "=" + encodeURIComponent(buildAdvancedQuery(criteria, opts))];
      if (opts && opts.page && Number(opts.page) > 1 && cfg.pageParam) parts.push(cfg.pageParam + "=" + encodeURIComponent(opts.page));
      return origin + cfg.searchPath + "?" + parts.join("&");
    }
    function parseArticleMeta(html) {
      if (cfg.metaProfile === "dublincore") {
        return parseDublinCoreArticle(html, source, { pdfTemplate: cfg.pdfTemplate, urlTemplate: cfg.articleUrlTemplate });
      }
      return parseHighwireArticle(html, source);
    }
    function harvestResultUrls(html) { return harvestHrefs(html, origin, cfg.linkMatch); }
    function parseReferences(html) { return parseHighwireReferences(html, cfg.refSelectors); }
    async function searchFromUrl(listUrl, query, page, ctx) {
      // Client-rendered search pages (e.g. taylorfrancis.com books) have no result
      // anchors in the fetched HTML — read the live rendered DOM instead. The SKILL
      // recipe navigates to listUrl and waits for render before injecting.
      const html = cfg.liveSearchDom && ctx.pageHtml ? await ctx.pageHtml(listUrl) : await ctx.fetchText(listUrl);
      const urls = harvestResultUrls(html).slice(0, pageSize);
      const articles = (await mapPool(urls, 3, async (u) => {
        try { return parseArticleMeta(await ctx.fetchText(u)); } catch (e) { return null; }
      })).filter(Boolean);
      return makeSearchResult({ query: query, source: source, page: page || 1, pageSize: pageSize, total: null, articles });
    }
    async function search(args, ctx) { return searchFromUrl(buildSearchUrl(args), args.query, args.page, ctx); }
    async function advancedSearch(args, ctx) {
      return searchFromUrl(buildAdvancedUrl(args.criteria, args), buildAdvancedQuery(args.criteria, args), args.page, ctx);
    }
    async function extractReferences(args, ctx) {
      const html = await ctx.fetchText(args.url);
      return { source: source, url: args.url, references: parseReferences(html) };
    }
    async function readFulltext(args, ctx) {
      const a = parseArticleMeta(await ctx.fetchText(args.url));
      if (!a.pdfUrl) return { error: "no_fulltext", source: source, note: "subscription/login required" };
      return { source: source, pdfUrl: a.pdfUrl };
    }
    return {
      source: source, origin: origin, pageSize: pageSize,
      capabilities: cfg.capabilities || { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
      fields: cfg.fields || {}, buildSearchUrl, buildAdvancedQuery, buildAdvancedUrl,
      parseArticleMeta, harvestResultUrls, parseReferences, search, advancedSearch, extractReferences, readFulltext,
    };
  }

  return { _adapters, register, get, normalizeArticle, makeSearchResult, canonicalDoi, normalizeTitle, dedupeArticles, makeBrowserCtx, pipelines, run, mapPool, parseHighwireArticle, parseDublinCoreArticle, harvestHrefs, parseHighwireReferences, makePublisherAdapter };
});
