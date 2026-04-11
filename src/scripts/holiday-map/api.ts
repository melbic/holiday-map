import type {
  CreateSharedMapRequest,
  CreateSharedMapResponse,
  FetchSharedMapResponse,
  ImportLinkRequest,
  ImportLinkResponse,
  UpdateSharedMapRequest,
  UpdateSharedMapResponse,
} from "../../lib/api-contracts.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function parseApiError(payload: unknown, fallbackMessage: string) {
  const message = getString(payload, "error");
  return message && message !== "" ? message : fallbackMessage;
}

function assertImportedLocationDraft(payload: unknown): ImportLinkResponse {
  if (
    !isRecord(payload)
    || typeof payload.title !== "string"
    || typeof payload.type !== "string"
    || typeof payload.description !== "string"
    || typeof payload.link !== "string"
    || typeof payload.photo !== "string"
    || (payload.status !== "complete" && payload.status !== "pending")
    || !Array.isArray(payload.notes)
    || !payload.notes.every((note) => typeof note === "string")
    || !(payload.latitude === undefined || typeof payload.latitude === "number")
    || !(payload.longitude === undefined || typeof payload.longitude === "number")
  ) {
    throw new Error("Import response was invalid.");
  }

  return payload as ImportLinkResponse;
}

function assertCreateSharedMapResponse(payload: unknown): CreateSharedMapResponse {
  if (
    !isRecord(payload)
    || typeof payload.shareId !== "string"
    || typeof payload.publicUrl !== "string"
    || typeof payload.editUrl !== "string"
    || typeof payload.lastChangedAt !== "string"
  ) {
    throw new Error("Share creation response was invalid.");
  }

  return payload as CreateSharedMapResponse;
}

function assertUpdateSharedMapResponse(payload: unknown): UpdateSharedMapResponse {
  if (!isRecord(payload) || typeof payload.lastChangedAt !== "string") {
    throw new Error("Shared map update response was invalid.");
  }

  return payload as UpdateSharedMapResponse;
}

function assertFetchSharedMapResponse(payload: unknown): FetchSharedMapResponse {
  if (
    !isRecord(payload)
    || (payload.name !== null && typeof payload.name !== "string")
    || typeof payload.shareId !== "string"
    || typeof payload.lastChangedAt !== "string"
    || typeof payload.csvText !== "string"
    || typeof payload.canEdit !== "boolean"
  ) {
    throw new Error("Shared map response was invalid.");
  }

  return payload as FetchSharedMapResponse;
}

export async function importLink(request: ImportLinkRequest) {
  const response = await fetch("/api/import-link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(parseApiError(payload, "Import failed."));
  }

  return assertImportedLocationDraft(payload);
}

export async function createShareMap(request: CreateSharedMapRequest) {
  const response = await fetch("/api/share-map", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(parseApiError(payload, "Could not create share link."));
  }

  return assertCreateSharedMapResponse(payload);
}

export async function updateShareMap(shareId: string, request: UpdateSharedMapRequest) {
  const response = await fetch(`/api/share-map/${shareId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(parseApiError(payload, "Could not update shared map."));
  }

  return assertUpdateSharedMapResponse(payload);
}

export async function fetchShareMap(shareId: string, editSecret: string) {
  const endpoint = new URL(`/api/share-map/${shareId}`, window.location.origin);

  if (editSecret) {
    endpoint.searchParams.set("edit", editSecret);
  }

  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(parseApiError(payload, "Could not load shared map."));
  }

  return assertFetchSharedMapResponse(payload);
}
