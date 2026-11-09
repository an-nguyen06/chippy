# Kaomoji dataset

Source: https://github.com/an-nguyen06/emoticon_kaomoji_dataset
Data: emoticon_dict.json from the repository's main branch, downloaded 2026-11-09.

The source README describes about 62,000 emoticons and kaomoji, with original site tags and manually assigned tags. See the source repository for its scraping sources and limitations. Original tags and expressions are preserved; manual tags supply the category menu. This is an uncurated dataset and may include adult or offensive expressions and tags.

No LICENSE file or declared repository license was present when imported. Attribution is retained, but it does not establish redistribution permission. Review upstream permissions before public distribution.

Import into the MongoDB configured in backend/.env:

```powershell
npm.cmd --prefix backend run seed:kaomoji
```

The importer uses deterministic SHA-256 IDs and upserts in batches of 500. Reruns update existing entries without duplicating them; it does not delete existing data. Empty entries or expressions longer than the current 4,000-character message limit are skipped.

Authenticated endpoints:
- GET /api/kaomoji?search=cat&category=cat&page=1&limit=40
- GET /api/kaomoji/categories

The collection page copies expressions; the message picker inserts them into the draft. Only a page of results is sent to the frontend; the full dataset is not bundled into the application JavaScript.

Downloaded JSON SHA-256: 7385138179df5fb52522aac8d2c9599d67f5a34a3da4b3a1cd88e463b0f6905f
