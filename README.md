# Holiday Map

A simple static holiday planning map built with Astro, TypeScript, Leaflet, and OpenStreetMap.

## Setup

1. Install dependencies with `npm install`.
2. Start development with `npm run dev`.
3. Build the static site with `npm run build`.
4. Import listing links with `npm run import:links -- --help`.

If your shell does not expose Node directly, load it first with:

```sh
source ~/.nvm/nvm.sh
nvm use
```

## CSV format

Edit [`src/data/locations.csv`](./src/data/locations.csv) with this fixed header set:

```csv
title,type,description,latitude,longitude,link
```

- `link` is optional and may be empty.
- Rows missing `title` or `type` are skipped.
- Rows without usable coordinates stay in the CSV and appear in a `Needs review` list in the sidebar.

## Import links

The project includes a local importer that scrapes pasted URLs, extracts metadata, and writes CSV rows.

Interactive review mode:

```sh
npm run import:links -- --interactive src/data/locations.csv
```

Interactive mode lets you:

- paste many URLs first, one per line
- auto-add rows when scraping succeeds completely
- review only rows that need manual input or correction
- edit any field before saving
- manually enter coordinates when scraping does not find them
- add rows without coordinates so they appear in `Needs review`
- manually create a row when a URL import fails
- choose at the end whether to replace the CSV or add lines to it

Use `--dry-run` first to review inferred data before writing:

```sh
npm run import:links -- --append --output src/data/locations.csv --dry-run --urls "https://www.inatur.no/hytte/62472aa2869f5c06c9506875 https://www.finn.no/reise/feriehus-hytteutleie/ad.html?finnkode=186297216"
```

Create a new CSV file instead of appending:

```sh
npm run import:links -- --create --output data/new-trip.csv --input urls.txt --dry-run
```

Write the results after reviewing the dry run:

```sh
npm run import:links -- --append --output src/data/locations.csv --urls "https://www.inatur.no/hytte/62472aa2869f5c06c9506875"
```

Importer behavior:

- The importer uses a generic extraction pipeline plus auto-discovered source strategies from `src/lib/importer/strategies/`.
- Specialized strategies currently exist for `inatur.no`, `finn.no`, `booking.com`, and Google Maps links like `maps.app.goo.gl` and `google.com/maps/...`.
- To support another source such as `airbnb.com`, add a new top-level strategy file in `src/lib/importer/strategies/`.
- It tries to extract coordinates from the page first.
- It only calls OpenStreetMap Nominatim when direct coordinates are not available.
- It infers `type` from structured data and content heuristics.
- It deduplicates by normalized `link` by default.
- If coordinates still cannot be resolved, the row is written with blank `latitude` and `longitude` so it shows up in `Needs review`.
- Some sites may block scraping or return partial content. Those rows can still be imported, but often need manual cleanup.

Examples of specialized sources:

```sh
npm run import:links -- --dry-run --urls "https://maps.app.goo.gl/13XC3V4FeEbZSvet6"
```

```sh
npm run import:links -- --dry-run --urls "https://www.finn.no/reise/feriehus-hytteutleie/ad.html?finnkode=186297216"
```

## GitHub Pages

The Astro config defaults to:

- `PUBLIC_BASE_PATH=/holiday-map`
- `PUBLIC_SITE_URL=https://example.com`

Override them for your deployment if needed:

```sh
PUBLIC_SITE_URL="https://YOUR-USER.github.io" \
PUBLIC_BASE_PATH="/holiday-map" \
npm run build
```
