# Brill adapter reference

**Home origin:** `https://brill.com`

**Access style:** Publisher site sharing the `__LR.makePublisherAdapter` model
(Highwire `citation_*` meta + fetch/parse). Built from config in
`scripts/adapters/brill.js`. No login needed for search/metadata; full-text PDF
needs a subscription.

_All structure below captured live 2026-06-29._

## URLs
- **Search:** `https://brill.com/search?q1=<query>` — an in-page `fetch` returns
  the result anchors server-side (no client render needed).
- **Article links in results:** `a[href*="/view/"]` matching
  `/view/.*article-.*\.xml`, e.g. `/view/journals/ts/12/2/article-p231_4.xml`.
  The `linkMatch` regex **excludes** non-article `/view/` noise: journal overview
  (`…-overview.xml`), issue TOCs (`….issue-1.xml`), serials (`/view/serial/…`),
  and databases (`/view/db/…`).

## Article metadata (`citation_*` meta)
`citation_title`, `citation_author` (repeated), `citation_journal_title`,
`citation_doi`, **`citation_publication_date`** (e.g. `2016/02/11` → year 2016),
`citation_pdf_url`, `citation_publisher`. Unlike Emerald, Brill emits a real date
meta, so `year` comes from it (DOI fallback still applies).

## References
`citation_reference` meta tags carry the bibliography (34 on the sample article).
DOM fallback selectors: `div[class*="ref"] li`, `.references li`, `.ref-list li`.

## Advanced field map
`title→title`, `author→author`, `abstract→abstract`, `doi→doi`, `journal→pub`,
built as `field:(term)` joined by AND/OR/NOT — **best-effort**; confirm against a
live smoke test before relying on `advancedSearch`.

## Harness caveat
As with Emerald, claude-in-chrome privacy-redacts author-name values in returned
tool output; the `citation_author` tags ARE parsed correctly in-page.
