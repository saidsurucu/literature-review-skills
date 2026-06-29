# Google Books adapter reference
**Endpoint:** `https://www.googleapis.com/books/v1/volumes?q=<q>` — CORS-open. Works **keyless but small quota** (HTTP 429); pass `{apiKey}` (`&key=`) for reliability. A dataless/error body → `{error:"rate_limited"}`.
`&maxResults=20&startIndex=<offset>`. Advanced prefixes: `intitle:`, `inauthor:`, `inpublisher:`, `subject:`, `isbn:`.
Map: `items[].volumeInfo` → title(+subtitle), authors[], publishedDate[:4], publisher (venue), description, infoLink (url), type "book". `totalItems`.
Capabilities: search, advancedSearch. Live CORS confirmed 2026-06-29 (keyless returned 429).
