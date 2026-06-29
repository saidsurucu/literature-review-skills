# CORE adapter reference
**Endpoint:** `https://api.core.ac.uk/v3/search/works?q=<q>` — 290M+ open-access papers **with full text**. **Requires a FREE API key** (https://core.ac.uk/services/api) in `args.apiKey` → `Authorization: Bearer`. Without a key the op returns `{error:"auth_required"}`.
`&limit=25&offset=<offset>`. Map: `results[]` → title, authors[].name, yearPublished, publisher/journals[0].title (venue), doi, downloadUrl (url + pdfUrl), abstract. `totalHits`.
Capabilities: search, advancedSearch. **Response shape is from the v3 docs — verify against a live key** (could not test keyless).
