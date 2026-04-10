import type { APIRoute } from "astro";

import { ShareMapValidationError, createSharedMap } from "../../lib/shared-maps.ts";

export const prerender = false;

const SHARE_MAP_RATE_LIMIT_WINDOW_MS = 60_000;
const SHARE_MAP_RATE_LIMIT_MAX_REQUESTS = 5;

type ShareMapRateLimitEntry = {
  count: number;
  resetAt: number;
};

const shareMapRateLimit = new Map<string, ShareMapRateLimitEntry>();

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor
    || request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function consumeShareMapRateLimit(request: Request) {
  const clientAddress = getClientAddress(request);
  const now = Date.now();
  const existing = shareMapRateLimit.get(clientAddress);

  if (!existing || existing.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + SHARE_MAP_RATE_LIMIT_WINDOW_MS,
    };
    shareMapRateLimit.set(clientAddress, nextEntry);
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (existing.count >= SHARE_MAP_RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}

export const POST: APIRoute = async ({ request, site }) => {
  const rateLimit = consumeShareMapRateLimit(request);

  if (rateLimit.limited) {
    return json(
      { error: "Too many share creation requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "retry-after": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

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
