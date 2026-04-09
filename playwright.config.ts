import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  webServer: {
    command: "zsh -lc 'source ~/.nvm/nvm.sh && nvm use 25.6.1 && npm run dev -- --host 127.0.0.1 --port 4321'",
    url: "http://127.0.0.1:4321/holiday-map",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
