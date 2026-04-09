# Photo UI and CSV Plan

1. Update the CSV contract to require `photo`.
   New header:
   `title,type,description,latitude,longitude,link,photo`

2. Extend parsed app data with optional `photo`.
   Add `photo?: string` to:
   - `LocationPin`
   - `PendingLocation`
   - importer row types
   - scrape result and strategy result types where needed

3. Add generic photo scraping to the importer.
   In `src/lib/importer/generic.ts`:
   - extract `og:image`
   - fallback to `og:image:url`
   - fallback to `twitter:image`
   - resolve relative URLs against the final page URL
   - keep only valid `http/https` URLs

4. Thread scraped photos through the import pipeline.
   Update:
   - `scrapePageFromHtml`
   - `mergeStrategyResult` in `src/lib/importer/pipeline.ts`
   - final `ImportedLocationDraft`
   - CSV serialization/deserialization so `photo` is preserved

5. Improve the sidebar list UI.
   In `src/scripts/holiday-map.ts` and `src/pages/index.astro`:
   - show the emoji icon on each row
   - make the title the primary text
   - keep type as a smaller secondary badge/label
   - keep a short description preview
   - apply the same visual structure to `Needs review`

6. Add photo support to marker popups.
   In `src/scripts/holiday-map.ts`:
   - render a photo block at the top of the Leaflet popup when `photo` exists
   - sanitize the photo URL before rendering
   - keep the current text-only popup when no photo exists

7. Add popup and list styling.
   In `src/pages/index.astro` CSS:
   - cleaner list cards with icon/title hierarchy
   - popup image sizing/cropping
   - popup content spacing
   - mobile-safe sizing

8. Update the sample CSV immediately.
   In `src/data/locations.csv`:
   - change the header to include `photo`
   - add the seventh column to all existing rows
   - keep blank values where no photo URL is available yet

9. Update tests for the schema and new behavior.
   Update:
   - `src/lib/locations.test.ts`
   - `src/lib/importer/pipeline.test.ts`
   - `src/lib/importer/interactive.test.ts`
   - `src/lib/importer/strategies/strategies.test.ts`
   - `e2e/upload-csv.spec.ts`

10. Verify the change end-to-end.
   Run:
   - `npm test`
   - `npm run test:e2e`
   - `ASTRO_TELEMETRY_DISABLED=1 npm run build`

11. Update repo instructions after implementation.
   In `AGENTS.md`, document:
   - the new required CSV header
   - popup photo behavior
   - importer photo scraping behavior
