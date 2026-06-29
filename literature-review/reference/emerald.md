# Emerald adapter reference

**Home origin:** `https://www.emerald.com`

**Access style:** Emerald runs on a **Silverchair SPA behind Cloudflare**. The
adapter fetches HTML via in-page `fetch` and parses with `DOMParser` — the search
response contains the result anchors server-side, so no client-side render is
needed. If the tab shows the Cloudflare interstitial (title "Just a moment…" or
Turkish "Bir dakika lütfen…"), ask the user to let it clear, then retry.

_All structure below captured live 2026-06-29._

## URLs
- **Search:** `https://www.emerald.com/search-results?q=<query>&page=<n>`
  (the legacy `/insight/search` path is gone; a bare navigate drops `?q=` on the
  Cloudflare redirect, but an in-page `fetch` of the full URL keeps it).
- **Article links in results:** anchors matching `a[href*="/doi/"]`, e.g.
  `/jkm/article/doi/10.1108/JKM-03-2026-0465/1384257/<slug>?searchresult=1`.
  Strip the `?searchresult=1` query and absolutize against the origin.

## Search flow
`search` fetches the listing, harvests up to 10 article URLs, then fetches each
(concurrency ≤3 via `mapPool`) and parses its `citation_*` meta. `total` is
`null` (count not reliably exposed); `hasNext` falls back to last-page-full.

## Article metadata (`citation_*` meta tags — Highwire)
`citation_title`, `citation_author` (repeated), `citation_journal_title`,
`citation_doi`, `citation_pdf_url`, `citation_publisher`, `citation_firstpage`.
**No `citation_*` date meta is emitted** — derive `year` from the DOI, which
embeds it (e.g. `JKM-03-2026-0465` → 2026); regex `/(20\d{2}|19\d{2})/`.

## References
`citation_reference` meta tags carry the bibliography (67 on the sample article);
parse those first. DOM fallback selectors: `.references li, ol.references li,
.ref-list li, section.references li`.

## Advanced field map (`criteria.field` → q-string hint)
`title→title`, `author→author`, `abstract→abstract`, `keywords→keyword`,
`doi→doi`, `journal→pub`. Built as `field:(term)` joined by AND/OR/NOT. The exact
Silverchair field syntax is **best-effort** and should be confirmed by a live
smoke test before relying on `advancedSearch`.

## Harness caveat
When run through claude-in-chrome, author-name values are privacy-redacted in the
tool output returned to Claude ("[BLOCKED: Sensitive key]"). The `citation_author`
tags ARE parsed correctly in-page; only the surfaced values are redacted. Titles,
DOIs, journals, and PDF URLs come through normally.
