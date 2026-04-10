import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { createCsvText } from "./importer/csv.ts";
import { parseLocationsCsv } from "./locations.ts";

type SharedMapRow = {
  id: string;
  name: string | null;
  share_id: string;
  edit_secret_hash: string;
  last_changed_at: string;
  created_at: string;
};

type SharedLocationRow = {
  title: string;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  link: string | null;
  photo: string | null;
};

type SharedMapWithLocations = {
  map: SharedMapRow;
  locations: SharedLocationRow[];
};

export type CreateSharedMapInput = {
  name?: string;
  csvText: string;
};

export type UpdateSharedMapInput = {
  name?: string;
  csvText: string;
  editSecret: string;
};

export type SharedMapResponse = {
  name: string | null;
  shareId: string;
  lastChangedAt: string;
  csvText: string;
  canEdit: boolean;
};

export type CreatedSharedMap = {
  shareId: string;
  editSecret: string;
  lastChangedAt: string;
};

function getSupabaseAdmin() {
  const url = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function ensureShareableCsv(csvText: string) {
  const parsed = parseLocationsCsv(csvText);

  if (parsed.locations.length === 0) {
    throw new Error("A shared map needs at least one valid mapped location.");
  }

  return parsed;
}

function hashEditSecret(secret: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyEditSecret(secret: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(secret, Buffer.from(saltHex, "hex"), expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toLocationInserts(mapId: string, csvText: string) {
  const parsed = ensureShareableCsv(csvText);

  return [...parsed.locations, ...parsed.pendingLocations].map((location) => ({
    map_id: mapId,
    title: location.title,
    type: location.type,
    description: location.description,
    latitude: "latitude" in location && typeof location.latitude === "number" ? location.latitude : null,
    longitude: "longitude" in location && typeof location.longitude === "number" ? location.longitude : null,
    link: location.link ?? null,
    photo: location.photo ?? null,
  }));
}

function createSharedCsvText(locations: SharedLocationRow[]) {
  return createCsvText(
    locations.map((location) => ({
      title: location.title,
      type: location.type,
      description: location.description,
      latitude: location.latitude ?? undefined,
      longitude: location.longitude ?? undefined,
      link: location.link ?? "",
      photo: location.photo ?? "",
    })),
  );
}

async function getSharedMapByShareId(shareId: string): Promise<SharedMapWithLocations | undefined> {
  const supabase = getSupabaseAdmin();

  const { data: map, error: mapError } = await supabase
    .from("maps")
    .select("id,name,share_id,edit_secret_hash,last_changed_at,created_at")
    .eq("share_id", shareId)
    .maybeSingle<SharedMapRow>();

  if (mapError) {
    throw new Error(mapError.message);
  }

  if (!map) {
    return undefined;
  }

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("title,type,description,latitude,longitude,link,photo")
    .eq("map_id", map.id)
    .returns<SharedLocationRow[]>();

  if (locationsError) {
    throw new Error(locationsError.message);
  }

  return {
    map,
    locations: locations ?? [],
  };
}

export async function createSharedMap(input: CreateSharedMapInput): Promise<CreatedSharedMap> {
  const supabase = getSupabaseAdmin();
  ensureShareableCsv(input.csvText);

  const editSecret = randomBytes(24).toString("base64url");
  const { data: map, error: mapError } = await supabase
    .from("maps")
    .insert({
      name: input.name?.trim() || null,
      edit_secret_hash: hashEditSecret(editSecret),
    })
    .select("id,share_id,last_changed_at")
    .single<{ id: string; share_id: string; last_changed_at: string }>();

  if (mapError || !map) {
    throw new Error(mapError?.message || "Could not create shared map.");
  }

  const { error: locationsError } = await supabase.from("locations").insert(toLocationInserts(map.id, input.csvText));

  if (locationsError) {
    throw new Error(locationsError.message);
  }

  return {
    shareId: map.share_id,
    editSecret,
    lastChangedAt: map.last_changed_at,
  };
}

export async function fetchSharedMap(shareId: string, editSecret?: string): Promise<SharedMapResponse | undefined> {
  const sharedMap = await getSharedMapByShareId(shareId);

  if (!sharedMap) {
    return undefined;
  }

  return {
    name: sharedMap.map.name,
    shareId: sharedMap.map.share_id,
    lastChangedAt: sharedMap.map.last_changed_at,
    csvText: createSharedCsvText(sharedMap.locations),
    canEdit: editSecret ? verifyEditSecret(editSecret, sharedMap.map.edit_secret_hash) : false,
  };
}

export async function updateSharedMap(shareId: string, input: UpdateSharedMapInput): Promise<{ lastChangedAt: string }> {
  const supabase = getSupabaseAdmin();
  ensureShareableCsv(input.csvText);

  const sharedMap = await getSharedMapByShareId(shareId);

  if (!sharedMap) {
    throw new Error("Shared map not found.");
  }

  if (!verifyEditSecret(input.editSecret, sharedMap.map.edit_secret_hash)) {
    throw new Error("Invalid edit secret.");
  }

  const { error: deleteError } = await supabase.from("locations").delete().eq("map_id", sharedMap.map.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: insertError } = await supabase.from("locations").insert(toLocationInserts(sharedMap.map.id, input.csvText));

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: updatedMap, error: updateError } = await supabase
    .from("maps")
    .update({
      name: input.name?.trim() || null,
      last_changed_at: new Date().toISOString(),
    })
    .eq("id", sharedMap.map.id)
    .select("last_changed_at")
    .single<{ last_changed_at: string }>();

  if (updateError || !updatedMap) {
    throw new Error(updateError?.message || "Could not update shared map.");
  }

  return {
    lastChangedAt: updatedMap.last_changed_at,
  };
}
