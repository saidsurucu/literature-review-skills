# Taylor & Francis / Routledge books adapter reference

**Home origin:** `https://www.taylorfrancis.com` (Routledge & T&F eBooks).
Distinct from the `tandf` journals adapter (`tandfonline.com`).

**Access style:** `__LR.makePublisherAdapter` with **`liveSearchDom: true`** and
the default (`highwire`) meta profile. No login for search/metadata; full-text
PDF needs a subscription.

_Structure verified live 2026-06-29._

## URLs
- **Search:** `https://www.taylorfrancis.com/search?key=<query>`. **Client-rendered**
  — the fetched HTML has no result anchors. The adapter harvests from the **live
  rendered DOM** (`ctx.pageHtml()`), so the SKILL recipe must navigate to the
  search URL and wait for results to render *before* injecting and calling `search`.
- **Book links:** `/books/mono/<doi>/<slug>` (monographs) and
  `/books/edit/<doi>/<slug>` (edited volumes); `linkMatch` is `/books/(mono|edit)/`.
- **Book detail pages are fetch+parse-able** (unlike the search) and are enriched
  per result via `ctx.fetchText`.

## Book metadata (Highwire `citation_*` meta)
`citation_title`, `citation_author` (repeated), `citation_doi`, `citation_isbn`,
`citation_publication_date` (e.g. `2001/03/28` → 2001), `citation_publisher`
(e.g. CRC Press, Routledge), `citation_pdf_url`, `citation_abstract`. Books expose
no `citation_journal_title`, so `venue` is `null`.

## Capabilities
`search` ✅ and `readFulltext` ✅ only. `advancedSearch` and `extractReferences`
are **unsupported** → `{error:"unsupported"}`: the search is client-rendered (no
reliable fielded query wired) and a whole book has no single flat bibliography
(references live per chapter).

## Harness caveat
claude-in-chrome privacy-redacts author-name values (`citation_author`) and the
`citation_pdf_url` query string in returned tool output; they ARE parsed
correctly in-page.
