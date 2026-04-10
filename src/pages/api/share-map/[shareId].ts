import type { APIRoute } from "astro";

import { fetchSharedMap, updateSharedMap } from "../../../lib/shared-maps.ts";

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

function getShareId(params: Record<string, string | undefined>) {
  const shareId = params.shareId;
  return typeof shareId === "string" && shareId !== "" ? shareId : undefined;
}

export const GET: APIRoute = async ({ params, url }) => {
  const shareId = getShareId(params);

  if (!shareId) {
    return json({ error: "shareId is required." }, { status: 400 });
  }

  try {
    const sharedMap = await fetchSharedMap(shareId, url.searchParams.get("edit") ?? undefined);

    if (!sharedMap) {
      return json({ error: "Shared map not found." }, { status: 404 });
    }

    return json(sharedMap, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load shared map.";
    return json({ error: message }, { status: 500 });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const shareId = getShareId(params);

  if (!shareId) {
    return json({ error: "shareId is required." }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = payload && typeof payload === "object" ? Reflect.get(payload, "name") : undefined;
  const csvText = payload && typeof payload === "object" ? Reflect.get(payload, "csvText") : undefined;
  const editSecret = payload && typeof payload === "object" ? Reflect.get(payload, "editSecret") : undefined;

  if (typeof csvText !== "string" || csvText.trim() === "") {
    return json({ error: "csvText is required." }, { status: 400 });
  }

  if (typeof editSecret !== "string" || editSecret.trim() === "") {
    return json({ error: "editSecret is required." }, { status: 400 });
  }

  try {
    const updated = await updateSharedMap(shareId, {
      name: typeof name === "string" ? name : undefined,
      csvText,
      editSecret,
    });

    return json(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update shared map.";
    const status =
      message === "Shared map not found."
        ? 404
        : message === "Invalid edit secret." || message.includes("at least one valid mapped location")
          ? 400
          : 500;
    return json({ error: message }, { status });
  }
};
