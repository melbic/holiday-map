---
name: local-supabase-verification
description: Run and troubleshoot the repo's local Supabase verification workflow for shared maps. Use when starting local Supabase, resetting the local database, exporting local Supabase env into app/test commands, or validating the real share-map flow end-to-end.
---

# Local Supabase Verification

Use this workflow when you need real database coverage for share-by-link behavior instead of mocked API responses.

## Scope

This repo includes a local Supabase project under `supabase/` and real verification commands for the shared-map backend and browser flow.

Use this skill for:

- starting the local Supabase stack
- resetting the local database and applying migrations
- running the real `shared-maps` integration tests
- running the real share-map browser flow against Astro plus local Supabase
- debugging local Supabase env wiring for `SUPABASE_URL` and `SUPABASE_SECRET_KEY`

## Primary Commands

Start local Supabase:

```sh
npx supabase start
```

Reset local database and re-apply migrations:

```sh
npx supabase db reset --local
```

Run real backend integration tests:

```sh
npm run test:shared-maps
```

Run the live browser share flow against local Supabase:

```sh
npm run test:e2e:share:live
```

Run the full local verification sequence:

```sh
npm run verify:local-supabase
```

## Env Wiring

Do not hardcode local Supabase keys manually when running app or test commands.

Use:

```sh
node scripts/with-local-supabase-env.mjs <command> [args...]
```

That wrapper reads:

```sh
npx supabase status -o env
```

and maps the local values to:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

The wrapper already includes a retry loop for container restarts after `supabase db reset --local`.

## Expected Coverage

`npm run test:shared-maps` verifies:

- real insert into `maps`
- real insert into `locations`
- public fetch
- edit-secret validation
- update and replacement of stored rows

`npm run test:e2e:share:live` verifies:

- upload local CSV in the app
- create public and edit share links through Astro API routes
- open public share URL
- open edit URL
- upload replacement CSV in edit mode
- update shared map and verify public view changed

## Troubleshooting

If `supabase status -o env` says the database is not ready:

1. wait a few seconds and retry
2. run `npx supabase start`
3. if needed, run `npx supabase db reset --local` again

If Playwright says port `4321` is already in use:

1. stop the stray local Astro dev server
2. rerun `npm run test:e2e:share:live`

If the live browser flow uses `https://example.com` links locally, check the API route logic in `src/pages/api/share-map.ts`. Local runtime URLs must prefer the incoming request origin over the fallback config site.

If Vite serves stale optimized dependencies during the live browser flow, clear `.astro/` and start a fresh dev server before retrying.
