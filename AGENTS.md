# AGENTS.md

## Maintenance Rule

- Always create or update `AGENTS.md` after finishing a task so the repo instructions stay in sync with the current implementation and workflow.

## Project

Static holiday planning map built with:

- Astro
- TypeScript
- Leaflet
- OpenStreetMap tiles

The site is fully static and intended to work well with GitHub Pages.

## Core Commands

If Node is not already on `PATH`, load it first:

```sh
source ~/.nvm/nvm.sh
nvm use 25.6.1
```

Project commands:

```sh
npm install
npm test
npm run test:e2e
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run dev
npm run import:links -- --help
```

## Data Contract

Location data uses the same CSV schema as `src/data/locations.csv`, but the main app now loads CSV content from a browser upload and stores it in local storage.

Use this exact header set:

```csv
title,type,description,latitude,longitude,link,photo
```

Rules:

- `link` may be empty.
- `photo` may be empty.
- `latitude` and `longitude` may be empty for rows that still need review.
- Rows missing `title` or `type` are skipped with warnings.
- Rows with missing or invalid coordinates stay in the CSV and appear in the sidebar review section until fixed.
- Keep the schema fixed unless the user explicitly asks to change it.

## Implementation Notes

- Keep the app statically buildable. Do not introduce server-side runtime requirements.
- Keep the map based on Leaflet with OpenStreetMap tiles unless the user asks to switch providers.
- Preserve GitHub Pages compatibility. The build uses Astro `base` handling from `astro.config.mjs`.
- Keep the UI simple by default: map, markers, popups, and the companion location list.
- Treat CSV content as untrusted input and escape any user-visible HTML.
- The runtime data source for the UI is browser-uploaded CSV stored in `localStorage`, not a bundled import in the page component.

## Current UI Behavior

- The app currently uses a full-window split layout:
  - left sidebar with the location list
  - right pane with the map
- The sidebar includes upload controls for selecting a CSV file and clearing the saved browser copy.
- The sidebar header with `Holiday Map` and the pin count is sticky while the sidebar content scrolls.
- The introductory page chrome was intentionally removed. Keep the interface focused on the list and map unless the user asks for more surrounding content.
- Location list items act as the primary control surface and highlight the active selection.
- The sidebar is a single shared scroll container: mapped items and `Needs review` scroll together.
- Location list items show a compact media preview using the CSV `photo` when present and the type emoji as fallback.
- List item text is intentionally compact: title plus a short type line.
- Rows without usable coordinates appear in a separate `Needs review` section in the sidebar and do not focus the map.
- Map pins are custom Leaflet `divIcon` markers that use emojis based on the CSV `type`.
- Marker popups show the CSV `photo` image when present, above the text details.
- The pin design is intentionally plain:
  - single-surface pin shape
  - no inner circle
  - emoji centered in the pin
- Unknown location types fall back to a generic pin emoji.
- If you change the visual direction of the layout or markers, update this file and `README.md` when the behavior is user-relevant.

## Testing Expectations

When changing parsing or rendering behavior:

- run `npm test`
- run `npm run test:e2e`
- run `ASTRO_TELEMETRY_DISABLED=1 npm run build`

If behavior changes affect the CSV schema or map interactions, update `README.md` too.

## Import Workflow

- Use the local importer for bulk link ingestion rather than adding runtime scraping.
- The importer is intentionally local and Node-based so the deployed app stays fully static and GitHub Pages compatible.
- Always prefer a `--dry-run` pass before writing imported rows.
- The importer also supports `--interactive` mode for paste-many terminal review, auto-adding complete rows, field editing for incomplete rows, manual coordinate entry, manual row creation on failed imports, and a final prompt to replace or append to the target CSV.
- The importer uses a generic pipeline plus auto-discovered top-level strategies from `src/lib/importer/strategies/`.
- Specialized strategy files currently exist for `inatur.no`, `finn.no`, `booking.com`, and Google Maps short/direct links.
- To add support for another source, create a new top-level strategy file in `src/lib/importer/strategies/` that exports a default strategy.
- The importer checks for embedded coordinates first and only falls back to Nominatim geocoding when needed.
- The importer stores a scraped main photo URL when page metadata exposes `og:image`, `og:image:url`, or `twitter:image`.
- Preserve pending rows when appending to an existing CSV.
