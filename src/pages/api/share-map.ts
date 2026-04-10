import type { APIRoute } from "astro";

import { ShareMapValidationError, createSharedMap } from "../../lib/shared-maps.ts";

export const prerender = false;

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

export const POST: APIRoute = async ({ request, site }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = payload && typeof payload === "object" ? Reflect.get(payload, "name") : undefined;
  const csvText = payload && typeof payload === "object" ? Reflect.get(payload, "csvText") : undefined;

  if (typeof csvText !== "string" || csvText.trim() === "") {
    return json({ error: "csvText is required." }, { status: 400 });
  }

  try {
    const created = await createSharedMap({
      name: typeof name === "string" ? name : undefined,
      csvText,
    });

    const configuredSite = site?.toString().replace(/\/$/, "");
    const origin = !configuredSite || configuredSite === "https://example.com"
      ? new URL(request.url).origin
      : configuredSite;

    return json(
      {
        shareId: created.shareId,
        publicUrl: `${origin}/map/${created.shareId}`,
        editUrl: `${origin}/map/${created.shareId}?edit=${created.editSecret}`,
        lastChangedAt: created.lastChangedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create shared map.";
    const status = error instanceof ShareMapValidationError ? 400 : 500;
    return json({ error: message }, { status });
  }
};
