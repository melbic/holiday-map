# Netlify Handoff Checklist

## A. Foundation

1. Confirm root-path migration scope.
   Files:
   - `astro.config.mjs`
   - `playwright.config.ts`
   - `README.md`
   Blocker:
   - none
   Done means:
   - no `/holiday-map` deployment assumption remains in the implementation plan

2. Confirm importer function contract.
   Files:
   - `src/pages/api/import-link.ts`
   - `src/lib/link-importer.ts`
   - `src/lib/importer/types.ts`
   Blocker:
   - none
   Done means:
   - request/response schema is fixed for `/api/import-link`

3. Confirm strategy bundling approach.
   Files:
   - `src/lib/importer/strategies/load-strategies.ts`
   - strategy files in `src/lib/importer/strategies/`
   Blocker:
   - Netlify bundling risk
   Done means:
   - keep dynamic loading or replace with static imports

## B. App Implementation

1. Netlify/Astro runtime migration.
   Files:
   - `astro.config.mjs`
   - `package.json`
   - maybe `src/env.d.ts`
   Blocker:
   - final adapter choice details
   Done means:
   - Astro is configured for Netlify, root path is default

2. Add backend import function.
   Files:
   - `src/pages/api/import-link.ts`
   - `src/lib/link-importer.ts`
   - `src/lib/importer/index.ts`
   - `src/lib/importer/pipeline.ts`
   - `src/lib/importer/types.ts`
   Blocker:
   - strategy bundling decision
   Done means:
   - function returns importer draft JSON from a pasted URL

3. Make importer code bundle-safe.
   Files:
   - `src/lib/importer/strategies/load-strategies.ts`
   - `src/lib/importer/strategies/google-maps.ts`
   - `src/lib/importer/strategies/finn.ts`
   - `src/lib/importer/strategies/booking.ts`
   - `src/lib/importer/strategies/inatur.ts`
   Blocker:
   - whether Netlify function tracing handles current loader
   Done means:
   - backend import works in Netlify runtime without missing strategy modules

4. Add sidebar `Add link` UI.
   Files:
   - `src/pages/index.astro`
   - `src/scripts/holiday-map.ts`
   Blocker:
   - import endpoint contract must be stable
   Done means:
   - user can paste URL, submit, and see loading/error/success states

5. Implement auto-save and review branching.
   Files:
   - `src/scripts/holiday-map.ts`
   - maybe shared validation helpers
   Blocker:
   - frontend must receive normalized importer result
   Done means:
   - auto-save when `title + type + coordinates + link` are present
   - otherwise open review form

6. Merge imported rows into browser-local dataset.
   Files:
   - `src/scripts/holiday-map.ts`
   - `src/lib/importer/csv.ts`
   - maybe `src/lib/locations.ts`
   Blocker:
   - review flow design
   Done means:
   - imported rows persist into local CSV/localStorage and appear in UI immediately

7. Add tests for backend and UI flow.
   Files:
   - `src/lib/importer/pipeline.test.ts`
   - `src/lib/importer/strategies/strategies.test.ts`
   - new function tests
   - `e2e/upload-csv.spec.ts`
   - new e2e add-link spec
   - `playwright.config.ts`
   Blocker:
   - root-path migration not yet reflected in tests
   Done means:
   - auto-save, review fallback, and root deployment assumptions are covered

## C. CI/CD, Netlify Setup, Deployment

1. Netlify site connection.
   Files:
   - none required initially
   Blocker:
   - repo access / Netlify account access
   Done means:
   - repo connected to Netlify
   - production branch chosen
   - preview deploys available

2. Netlify deployment config.
   Files:
   - likely `netlify.toml`
   - `astro.config.mjs`
   - `package.json`
   Blocker:
   - final build output/function path decisions
   Done means:
   - build command, publish output, functions path, and runtime behavior are explicit

3. Environment variables plan.
   Files:
   - `README.md`
   - maybe `src/env.d.ts`
   Blocker:
   - whether new backend env vars are needed
   Done means:
   - all required public/private env vars are listed and assigned in Netlify

4. CI check policy.
   Files:
   - possibly `.github/workflows/*` if GitHub-side CI is kept/added
   - `package.json`
   Blocker:
   - team decision on GitHub vs Netlify as source of truth for checks
   Done means:
   - required checks are defined: tests, e2e, build

5. Preview and production deployment behavior.
   Files:
   - `README.md`
   - maybe `netlify.toml`
   Blocker:
   - site connection must already exist
   Done means:
   - PR preview flow is clear
   - merge-to-main production flow is clear
   - rollback path is known

6. Docs migration away from GitHub Pages.
   Files:
   - `README.md`
   - `AGENTS.md`
   Blocker:
   - deployment design must be final
   Done means:
   - GitHub Pages instructions removed
   - Netlify deployment and online import behavior documented cleanly

## D. Parallelization Plan

1. Start immediately in parallel:
   - Subagent 1: root-path + Astro/Netlify config analysis
   - Subagent 2: importer bundling/function-wrapper analysis
   - Subagent 3: Netlify deployment/setup checklist
   - Subagent 4: frontend `Add link` UX integration plan

2. Wait for foundation decision before full execution on:
   - strategy loader implementation
   - final `netlify.toml`
   - root-path e2e updates
   - final docs rewrite

3. Converge before implementation:
   - endpoint contract
   - strategy loading approach
   - Netlify build/runtime assumptions
   - test root URL assumptions

## E. Critical Blockers

1. `load-strategies.ts` may not bundle cleanly in Netlify Functions.
2. Current tests still assume `/holiday-map/`.
3. Astro config currently defaults to GitHub Pages base path.
4. Deployment docs still contain GitHub Pages-specific instructions.

## F. Definition of Done

1. App Implementation done when:
   - online `Add link` works
   - complete imports auto-save
   - incomplete imports open review
   - browser-local CSV workflow still works
   - tests/build pass

2. Deployment track done when:
   - Netlify site is connected
   - preview and production deploys work
   - env vars are configured
   - CI expectations are defined
   - docs reflect Netlify only

Yes, these topics can be worked on in parallel after the short shared foundation decisions are locked.
