# Google Scholar adapter reference

**Home origin:** `https://scholar.google.com`

**Access style:** Custom adapter (NOT `makePublisherAdapter`). Scholar emits no
`citation_*` / Dublin Core meta; each result is parsed directly from the SERP
DOM. No institutional login needed, but Scholar is **heavily bot-gated**.

_Structure verified live 2026-06-29 (after the user cleared a CAPTCHA)._

## Capabilities
`search` ✅, `advancedSearch` ✅ (operators). `readFulltext` and
`extractReferences` are **unsupported** → `{error:"unsupported"}`: Scholar gives
forward "cited-by" links, not the article's own bibliography, and links out to
publisher pages for full text.

## URLs
- **Search:** `https://scholar.google.com/scholar?q=<query>&start=<(page-1)*10>`
  (`as_ylo`/`as_yhi` for a year range).
- **Advanced operators** live inside `q`: `author:"…"`, `source:"…"` (journal),
  `intitle:"…"`; year range → `as_ylo`/`as_yhi`.

## Result parsing (per `.gs_ri`)
- `title` ← `.gs_rt a` text (a leading `[PDF]`/`[BOOK]` tag is stripped).
- `url` ← `.gs_rt a` href (an external publisher URL).
- `.gs_a` text "Authors - Venue, Year - domain" → `authors` (split on `,` before
  the first ` - `), `year` (`\b(19|20)\d{2}\b`), `venue` (middle segment minus the
  year). `doi` is `null` (Scholar rarely exposes it).
- `citationCount` ← `.gs_fl a` "Cited by N" (best-effort; absent on many results).
- `total` is `null` (Scholar's "About N results" is unreliable).

## CAPTCHA handling
`looksBlocked()` detects the `/sorry/` interstitial / "unusual traffic" page and
the op returns `{error:"challenge", note:"… solve it in the tab and retry"}`.
**Never solve the CAPTCHA programmatically** — surface it to the user.

## Harness caveat
claude-in-chrome privacy-redacts author names (and sometimes collapses the
`.gs_a` text, which can shift the parsed `venue`) in returned tool output. Parsing
is correct against the raw SERP (see the committed fixture); only the values
surfaced back to Claude are redacted.
