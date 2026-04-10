import type { ImportedLocationDraft } from "./link-importer.ts";

export type ApiErrorResponse = {
  error: string;
};

export type CreateSharedMapRequest = {
  name?: string;
  csvText: string;
};

export type CreateSharedMapResponse = {
  shareId: string;
  publicUrl: string;
  editUrl: string;
  lastChangedAt: string;
};

export type UpdateSharedMapRequest = {
  name?: string;
  csvText: string;
  editSecret: string;
};

export type UpdateSharedMapResponse = {
  lastChangedAt: string;
};

export type FetchSharedMapResponse = {
  name: string | null;
  shareId: string;
  lastChangedAt: string;
  csvText: string;
  canEdit: boolean;
};

export type ImportLinkRequest = {
  url: string;
};

export type ImportLinkResponse = ImportedLocationDraft;
