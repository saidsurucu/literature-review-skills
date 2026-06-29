# Wiley adapter reference

**Home origin:** `https://onlinelibrary.wiley.com` (Atypon/Literatum).

**Access style:** Publisher site via `__LR.makePublisherAdapter`, **default
(`highwire`) meta profile** — unlike T&F, Wiley emits Highwire `citation_*` tags.
No login for search/metadata; full-text PDF needs a subscription. Cloudflare is
present but passes without a challenge for search.

_All structure below captured live 2026-06-29._

## URLs
- **Search:** `https://onlinelibrary.wiley.com/action/doSearch?AllField=<query>`
  — an in-page `fetch` returns result anchors server-side.
- **Article/chapter links:** `/doi/10.<doi>` (e.g. `/doi/10.1002/jsc.814`, and
  book chapters `/doi/10.1002/<isbn>.chN`). `linkMatch` is `/doi/10.`, which
  **excludes** whole-book landing pages `/doi/book/<doi>`.

## Article metadata (`citation_*` Highwire meta)
`citation_title`, `citation_author` (repeated), `citation_journal_title`,
`citation_doi`, `citation_publication_date` (e.g. `2008/01/01` → 2008),
`citation_pdf_url` (`/doi/pdf/<doi>`), `citation_publisher`.

## References
No `citation_reference` meta. Parsed from the DOM:
`.article-section__references li` (18 on the sample article), with
`section[id*="reference"] li` and `.references li` fallbacks. Book chapters may
expose no reference list (graceful empty result).

## Advanced search
Routed through `AllField` as a keyword approximation (Atypon's fielded
`doSearch` params not yet mapped). **Best-effort**; pagination not yet wired
(page 1 only).

## Harness caveat
claude-in-chrome privacy-redacts author-name values (`citation_author`) in
returned tool output; they ARE parsed correctly in-page.
