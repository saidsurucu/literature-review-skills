# Semantic Scholar adapter reference

**Endpoint base:** `https://api.semanticscholar.org/graph/v1` — free JSON API.

**Access caveats (verified live 2026-06-29):**
- **NOT CORS-open.** A cross-origin `fetch` fails ("Failed to fetch"). **Navigate
  to the `api.semanticscholar.org` origin first** (e.g.
  `…/graph/v1/paper/search?query=test&fields=title`) so the fetch is same-origin.
- **Heavily rate-limited** without a key (the keyless shared pool returns HTTP
  429). Pass `{apiKey}` in args → sent as the `x-api-key` header. A 429 / dataless
  body is surfaced as `{error:"rate_limited"}`.
- OpenAlex provides comparable coverage (citations + references) keyless and
  CORS-open — **prefer OpenAlex** unless you specifically want S2's TLDR summaries.

## Endpoints
- **Search:** `GET /paper/search?query=<q>&limit=25&offset=<(n-1)*25>&fields=title,year,venue,externalIds,authors,abstract,citationCount,openAccessPdf,tldr` → `{total, data[]}`. Year range via `&year=YYYY-YYYY`.
- **References:** `GET /paper/<id>/references?fields=title,year,externalIds,authors&limit=100` (`id` = paperId, or `DOI:<doi>`).
- **Single paper:** `GET /paper/<id>?fields=openAccessPdf` (for full text).

## Mapping (paper → Article)
`title←title`, `authors←authors[].name`, `year←year`, `venue←venue`,
`doi←externalIds.DOI`, `citationCount←citationCount`, `pdfUrl←openAccessPdf.url`,
`abstract←tldr.text || abstract` (TLDR preferred), `url=semanticscholar.org/paper/<paperId>`.

## Capabilities
`search`, `advancedSearch`, `readFulltext` (OA PDF), `extractReferences`.
`total` = response `total`.
