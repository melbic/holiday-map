import type { APIRoute } from "astro";

import type { ImportLinkRequest } from "../../lib/api-contracts.ts";
import { createImportDependencies, importUrl } from "../../lib/link-importer.ts";

export const prerender = false;

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function parseImportLinkRequest(payload: unknown): ImportLinkRequest | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const url = "url" in payload && typeof payload.url === "string" ? payload.url : undefined;

  if (!isHttpUrl(url)) {
    return undefined;
  }

  return { url };
}

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseImportLinkRequest(payload);

  if (!parsed) {
    return json({ error: "A valid http or https URL is required." }, { status: 400 });
  }

  try {
    const imported = await importUrl(parsed.url, createImportDependencies());
    return json(imported, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return json({ error: message }, { status: 500 });
  }
};
