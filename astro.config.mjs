import { defineConfig } from "astro/config";

const site = process.env.PUBLIC_SITE_URL ?? "https://example.com";
const base = process.env.PUBLIC_BASE_PATH ?? "/holiday-map";

export default defineConfig({
  output: "static",
  site,
  base,
});
