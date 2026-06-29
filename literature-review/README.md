# literature-review

A Claude skill that searches and reads academic literature across scholarly
sources by driving the user's own authenticated Chrome (the same approach as the
`dergipark` and `trdizin` skills). Because requests run in the user's browser
session, institutional access, paywalls, and CAPTCHA gates are handled by their
existing login.

**v1 sources:** PubMed (NCBI E-utilities) and Emerald (Silverchair site). Planned:
Scopus, Web of Science, Google Scholar, Taylor & Francis (incl. Routledge), Wiley,
Brill — each added as a self-registering adapter behind the same four operations
(`search`, `advancedSearch`, `readFulltext`, `extractReferences`).

Each source declares a capability matrix; unsupported source×operation
combinations return a structured `unsupported` error rather than fabricated data.

## Architecture

- `scripts/lib.js` — `window.__LR` core: normalized Article schema, idempotent
  adapter registry, capability-gated dispatcher, generic op pipelines, dedupe.
- `scripts/adapters/<src>.js` — one self-registering adapter per source.
- `scripts/pdf_extract.js` + vendored `pdfjs.*` — PDF text extraction.
- `scripts/references.js` — generic reference fetch delegating to adapter hooks.
- `reference/<src>.md` — per-source endpoints, selectors, field maps, caveats.

See `SKILL.md` for the operating model and the capability matrix.

## Tests

```bash
cd tests && npm install && npm test
```

Pure functions (URL/query builders, parsers, schema, dedupe) are unit-tested in
Node with `jsdom`. Parser tests run against committed fixtures captured from the
live sources (each fixture records its provenance and capture date). Browser
orchestration is verified by a live smoke test (see the plan in
`docs/superpowers/plans/`).
