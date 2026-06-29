# literature-review

A Claude skill that searches and reads academic literature across **21 scholarly
sources** — partly through **free open APIs** and partly by driving the user's own
Chrome (the same browser-automation approach as the `dergipark` / `trdizin`
skills). Every source is a self-registering adapter behind four uniform
operations: `search`, `advancedSearch`, `readFulltext`, `extractReferences`.

Each source declares a capability matrix; unsupported source×operation
combinations return a structured `{error:"unsupported"}` rather than fabricated
data. See [`SKILL.md`](SKILL.md) for the full operating model.

## Sources

**Free APIs — no login, mostly CORS-open (call from any tab):**
OpenAlex · Crossref · Europe PMC · Semantic Scholar¹ · arXiv¹ · bioRxiv/medRxiv ·
DOAJ · DataCite · HAL · Open Library · Google Books² · CORE³ · Unpaywall⁴ ·
OpenCitations⁴ · PubMed¹

**Browser-driven (the user's session; navigate-first):**
Google Scholar⁵ · Emerald · Brill · Taylor & Francis journals (incl. Routledge) ·
Routledge/T&F books · Wiley

<sub>¹ navigate-first (not CORS-open)  ² keyless quota is small (429); `apiKey` recommended
³ free API key required  ⁴ by-DOI enhancer only (Unpaywall→`readFulltext`,
OpenCitations→`extractReferences`)  ⁵ heavily CAPTCHA-gated</sub>

**Not implemented / deferred:** Scopus & Web of Science (institutional login);
SSRN, SAGE, MDPI (anti-bot/Cloudflare); OSF, SciELO (CORS-blocked). Springer,
Nature, Oxford, Cambridge, Frontiers, PLOS etc. are already searchable via
OpenAlex/Crossref/Europe PMC, so they have no dedicated adapter.

## Architecture

- `scripts/lib.js` — the `window.__LR` core: normalized Article schema, idempotent
  adapter registry, capability-gated dispatcher (every op wrapped so 429/network/
  parse failures return a structured `error`, never throw), generic op pipelines,
  cross-source dedupe, and `makePublisherAdapter` (a config-driven publisher factory
  with `highwire` / `dublincore` meta profiles and a `liveSearchDom` mode for
  client-rendered search pages).
- `scripts/adapters/<src>.js` — one self-registering adapter per source. Publisher
  adapters are ~15 lines of config; API adapters are small custom modules.
- `scripts/pdf_extract.js` + vendored `pdfjs.*` — PDF text extraction
  (absolute-URL, CSP-safe).
- `scripts/references.js` — generic reference fetch delegating to adapter hooks.
- `reference/<src>.md` — per-source endpoints, selectors, field maps, and caveats
  (CORS, rate limits, harness redaction, anti-bot gates).

## Normalized result

```
Article      = { source, title, authors[], year, venue, doi, url,
                 abstract, type, citationCount, pdfUrl }
SearchResult = { query, source, pagination:{ page, total, hasNext }, articles[] }
```

Cross-source result sets dedupe by canonical DOI, then normalized title
(`__LR.dedupeArticles`).

## Tests

```bash
cd tests && npm install && npm test     # node --test + jsdom
```

93 tests. Pure functions (URL/query builders, parsers, schema, dedupe, dispatch
error-handling) are unit-tested in Node with `jsdom`. Parser tests run against
committed fixtures captured from the live sources — each fixture records its
source URL and capture date. Browser/API orchestration was additionally verified
by live smoke tests during development (see `docs/superpowers/` for the spec and
plan).

## Provenance

Built spec-first (brainstorm → spec → plan → TDD), with two adversarial Codex
reviews folded in. Each source's real structure was discovered live rather than
assumed — notes on what differed from expectations live in the per-source
`reference/*.md` files.
