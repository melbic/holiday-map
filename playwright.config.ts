import { defineConfig } from "@playwright/test";

const shellPrefix = ". ~/.nvm/nvm.sh && nvm use 25.6.1 &&";
const baseDevCommand = "source ~/.nvm/nvm.sh && nvm use 25.6.1 && npm run dev -- --host 127.0.0.1 --port 4321";
const webServerCommand = process.env.PLAYWRIGHT_USE_LOCAL_SUPABASE === "1"
  ? `sh -lc 'rm -rf .astro && ${shellPrefix} node scripts/with-local-supabase-env.mjs npm run dev -- --host 127.0.0.1 --port 4321'`
  : `sh -lc '${shellPrefix} npm run dev -- --host 127.0.0.1 --port 4321'`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  webServer: {
    command: webServerCommand,
    url: "http://127.0.0.1:4321/",
    reuseExistingServer: process.env.PLAYWRIGHT_USE_LOCAL_SUPABASE === "1" ? false : !process.env.CI,
    timeout: 120000,
  },
});
