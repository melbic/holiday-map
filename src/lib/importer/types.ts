export type ImportedLocationDraft = {
  title: string;
  type: string;
  description: string;
  latitude?: number;
  longitude?: number;
  link: string;
  photo: string;
  status: "complete" | "pending";
  notes: string[];
};

export type CsvLocationRow = {
  title: string;
  type: string;
  description: string;
  latitude?: number;
  longitude?: number;
  link: string;
  photo: string;
};

export type ScrapePageResult = {
  url: string;
  finalUrl: string;
  statusCode?: number;
  title?: string;
  description?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  photo?: string;
  addressCandidates: string[];
  notes: string[];
};

export type CsvWriteOptions = {
  append: boolean;
  dedupe: boolean;
  existingCsvText?: string;
};

export type CsvWriteResult = {
  csvText: string;
  written: ImportedLocationDraft[];
  skipped: Array<{ row: ImportedLocationDraft; reason: string }>;
};

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type FetchPageOptions = {
  userAgent?: string;
  headers?: Record<string, string>;
};

export type ImportDependencies = {
  fetchPage: (url: string, options?: FetchPageOptions) => Promise<{ finalUrl: string; statusCode?: number; html: string }>;
  fetchJson: <T>(url: string) => Promise<T>;
  geocodeAddress: (query: string) => Promise<GeocodeResult | undefined>;
  delay?: (ms: number) => Promise<void>;
};

export type StrategyResult = {
  title?: string;
  description?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  photo?: string;
  addressCandidates?: string[];
  notes?: string[];
};

export type StrategyContext = {
  url: URL;
  page: {
    finalUrl: string;
    statusCode?: number;
    html: string;
  };
  scraped: ScrapePageResult;
  dependencies: ImportDependencies;
};

export type ImportStrategy = {
  id: string;
  priority: number;
  matches: (url: URL) => boolean;
  getFetchOptions?: (url: URL) => FetchPageOptions | Promise<FetchPageOptions | undefined>;
  extract: (context: StrategyContext) => Promise<StrategyResult | undefined>;
};
