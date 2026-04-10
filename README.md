# Holiday Map

A simple static holiday planning map built with Astro, TypeScript, Leaflet, and OpenStreetMap.
The app loads trip data from a CSV you upload in the browser, stores that CSV locally in `localStorage`, and can scrape supported listing links online when hosted on Netlify.

## Setup

1. Install dependencies with `npm install`.
2. Start development with `npm run dev`.
3. Run unit tests with `npm test`.
4. Run browser tests with `npm run test:e2e`.
5. Build the static site with `npm run build`.
6. Import listing links with `npm run import:links -- --help`.

If your shell does not expose Node directly, load it first with:

```sh
source ~/.nvm/nvm.sh
nvm use
```

## CSV format

Prepare a CSV with this fixed header set. You can use [`src/data/locations.csv`](./src/data/locations.csv) as an example input file for imports or manual editing:

```csv
title,type,description,latitude,longitude,link,photo
```

- `link` is optional and may be empty.
- `photo` is optional and may be empty.
- Rows missing `title` or `type` are skipped.
- Rows without usable coordinates stay in the CSV and appear in a `Needs review` list in the sidebar.

## App data loading

The site no longer bundles location data into the page.

- Use the `Upload CSV` control in the sidebar to load a file into the app.
- Use `Add link` to scrape a supported URL online and merge the result into the local browser CSV.
- Use `Download CSV` to export the current browser-local CSV with a dated filename.
- Use `Share map` to create a public read link plus a private edit link when the local CSV contains at least one valid mapped location.
- The selected CSV is stored only in your browser's `localStorage` and restored on reload.
- Use `Clear local data` to remove the saved browser copy.
- Uploaded/imported data stays in the browser until you replace or clear it.

## UI behavior

- The sidebar header stays sticky while the sidebar content scrolls.
- Mapped locations and `Needs review` rows scroll together in one shared sidebar scroll area.
- Sidebar rows use compact cards with a media preview.
- The media preview shows `photo` when present and falls back to the location type emoji when the image is missing or fails.
- Map popups show the `photo` at the top when available.

## Import links

The project includes a local importer that scrapes pasted URLs, extracts metadata, and writes CSV rows.

The Netlify-hosted app also exposes `/api/import-link` so the website can scrape one supported link at a time and merge it into the browser-local CSV.

Website import behavior:

- Complete imports auto-save immediately when `title`, `type`, valid coordinates, and `link` are present.
- Incomplete imports open a review modal before saving.
- Imported rows are merged into the current browser-local CSV state.

Share-by-link uses Supabase-backed API routes.

- Public shared routes use `/map/{shareId}` and render the shared map in read-only mode with only `Download CSV` exposed.
- Private edit links use `/map/{shareId}?edit={secret}` and unlock upload, link import, clear, and `Update shared map` for that shared map.
- Shared-map updates replace the server-stored CSV content and keep the same public and private URLs.
- Anonymous share creation is server-side rate-limited per client IP to reduce abuse of the public share endpoint.

When a page exposes a main image in metadata, the importer stores it in the `photo` column so the map popup can show it.

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

## Netlify deployment

The app is intended to be deployed on Netlify.

Repo-side deployment config:

- `netlify.toml` defines the build command, publish directory, function bundling, and Node version.
- `.github/workflows/ci.yml` runs unit tests, Playwright tests, and the Astro build on pushes and pull requests.

Recommended Netlify setup:

1. Create a new Netlify site from this GitHub repository.
2. Use the default production branch (`main`).
3. Keep the build command as `npm run build`.
4. Keep the publish directory as `dist`.
5. Let Netlify read `netlify.toml` for Node version and function bundling.
6. Netlify's default deploy URL is used automatically.
7. Set `PUBLIC_SITE_URL` only if you want to override it with a custom domain.

Useful environment variables:

```sh
PUBLIC_SITE_URL="https://your-site.netlify.app" \
npm run build
```

On Netlify itself, this variable is optional because the build falls back to Netlify's built-in deploy URL environment variables.

Share-map backend environment variables:

```sh
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SECRET_KEY="your-secret-key"
```

Hosted Supabase also needs the SQL migrations from `supabase/migrations/` applied, not just the initial table creation.

## Local Supabase

The repo now includes a local Supabase project in `supabase/` for real share-map testing.

Common local commands:

```sh
npx supabase start
npx supabase db reset --local
npm run test:shared-maps
npm run test:e2e:share:live
npm run verify:local-supabase
```

Notes:

- `scripts/with-local-supabase-env.mjs` reads `npx supabase status -o env` and maps the local values to `SUPABASE_URL` and `SUPABASE_SECRET_KEY` automatically.
- `npm run test:shared-maps` runs real integration tests against the local `maps` and `locations` tables.
- `npm run test:e2e:share:live` runs the share flow through the Astro app and real local Supabase instead of stubbing the API.
- `npm run verify:local-supabase` runs the local Supabase start/reset plus both real verification commands in sequence.
- The mocked Playwright suite in `npm run test:e2e` remains useful for fast frontend regression coverage.
- Shared-map writes now run through database RPC functions so create/update is atomic.
- Hosted Supabase should apply all repo migrations so RLS, RPC functions, and stable shared-location ordering are present.

Recommended deploy flow:

- Pull requests get GitHub CI plus Netlify preview deploys.
- Merges to `main` trigger the production deploy.
- If a deploy regresses, use Netlify's previous deploy rollback.
