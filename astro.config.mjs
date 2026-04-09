import netlify from "@astrojs/netlify";
import { defineConfig } from "astro/config";

const site =
  process.env.PUBLIC_SITE_URL ??
  process.env.URL ??
  process.env.DEPLOY_PRIME_URL ??
  process.env.DEPLOY_URL ??
  "https://example.com";
const base = process.env.PUBLIC_BASE_PATH ?? "/";

export default defineConfig({
  output: "static",
  site,
  base,
  adapter: netlify(),
});
