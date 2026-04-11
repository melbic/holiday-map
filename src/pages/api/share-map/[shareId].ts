import type { APIRoute } from "astro";

import type { UpdateSharedMapRequest } from "../../../lib/api-contracts.ts";
import {
  ShareMapAuthError,
  ShareMapNotFoundError,
  ShareMapValidationError,
  fetchSharedMap,
  updateSharedMap,
} from "../../../lib/shared-maps.ts";

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

function parseUpdateSharedMapRequest(payload: unknown): UpdateSharedMapRequest | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const name = "name" in payload && typeof payload.name === "string" ? payload.name : undefined;
  const csvText = "csvText" in payload && typeof payload.csvText === "string" ? payload.csvText : undefined;
  const editSecret = "editSecret" in payload && typeof payload.editSecret === "string" ? payload.editSecret : undefined;

  if (!csvText || csvText.trim() === "" || !editSecret || editSecret.trim() === "") {
    return undefined;
  }

  return { name, csvText, editSecret };
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

  const parsed = parseUpdateSharedMapRequest(payload);

  if (!parsed) {
    return json({ error: "csvText and editSecret are required." }, { status: 400 });
  }

  try {
    const updated = await updateSharedMap(shareId, parsed);

    return json(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update shared map.";
    const status = error instanceof ShareMapNotFoundError
      ? 404
      : error instanceof ShareMapAuthError || error instanceof ShareMapValidationError
        ? 400
        : 500;
    return json({ error: message }, { status });
  }
};
