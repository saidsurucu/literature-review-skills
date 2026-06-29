# Taylor & Francis adapter reference

**Home origin:** `https://www.tandfonline.com` (Atypon/Literatum platform).
Covers **Routledge** too — Routledge journal articles carry `dc.Publisher`
"Routledge" on the same `tandfonline.com` site.

**Access style:** Publisher site via `__LR.makePublisherAdapter` with the
**`dublincore` meta profile**. No login for search/metadata; full-text PDF needs
a subscription. Cloudflare is present but passes without a challenge for search.

_All structure below captured live 2026-06-29._

## URLs
- **Search:** `https://www.tandfonline.com/action/doSearch?AllField=<query>` — an
  in-page `fetch` returns the result anchors server-side.
- **Article links:** results expose both `/doi/abs/<doi>` and `/doi/full/<doi>`
  for each item; `linkMatch` keeps **`/doi/full/`** only (one per article, no
  abs/full duplicates) and strips any `?needAccess=true` query.
- **Derived:** `pdfUrl = /doi/pdf/<doi>`, `url = /doi/full/<doi>`.

## Article metadata (Dublin Core — NOT Highwire)
T&F/Atypon emits `dc.*`, not `citation_*` (only `citation_journal_title` is
Highwire). Mapping:
`title←dc.Title`, `authors←dc.Creator` (repeated; double spaces collapsed),
`year←dc.Date` (e.g. `2026-6-6` → 2026), `doi←meta[name="dc.Identifier"][scheme="doi"]`
(publisher-id / submission-id identifiers are ignored), `venue←citation_journal_title`,
`abstract←dc.Description`.

**Graceful degradation:** older articles may lack the DOI-schemed identifier and
a DOM reference list — those come back with `doi:null` / empty references while
title/venue/year still populate.

## References
No `citation_reference` meta. Parsed from the DOM: `.references li`
(91 on the sample modern article), with `ul/ol.references li`, `.ref-list li`
fallbacks.

## Advanced search
Routed through `AllField` as a keyword approximation (Atypon's true fielded
`doSearch` params — `Title`, `Contrib`, `AbstractField` — are not yet mapped).
**Best-effort**; confirm before relying on `advancedSearch`. Pagination
(`startPage`/`pageSize`, 0-based) is not yet wired, so results are page 1.

## Harness caveat
As with the other publishers, claude-in-chrome privacy-redacts author-name values
(`dc.Creator`) in returned tool output; they ARE parsed correctly in-page.
