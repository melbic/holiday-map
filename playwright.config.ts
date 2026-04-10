import { defineConfig } from "@playwright/test";

const baseDevCommand = "source ~/.nvm/nvm.sh && nvm use 25.6.1 && npm run dev -- --host 127.0.0.1 --port 4321";
const webServerCommand = process.env.PLAYWRIGHT_USE_LOCAL_SUPABASE === "1"
  ? `zsh -lc 'rm -rf .astro && source ~/.nvm/nvm.sh && nvm use 25.6.1 && node scripts/with-local-supabase-env.mjs npm run dev -- --host 127.0.0.1 --port 4321'`
  : `zsh -lc '${baseDevCommand}'`;

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
