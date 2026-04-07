import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ImportStrategy } from "../types.ts";

const strategiesDirectory = path.dirname(new URL(import.meta.url).pathname);

let cachedStrategiesPromise: Promise<ImportStrategy[]> | undefined;

function isStrategyFile(fileName: string): boolean {
  if (fileName.startsWith(".")) {
    return false;
  }

  if (fileName === "load-strategies.ts" || fileName.endsWith(".test.ts") || !fileName.endsWith(".ts")) {
    return false;
  }

  return true;
}

async function loadStrategiesInternal(): Promise<ImportStrategy[]> {
  const entries = await readdir(strategiesDirectory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && isStrategyFile(entry.name)).map((entry) => entry.name).sort();
  const modules = await Promise.all(
    files.map(async (fileName) => {
      const moduleUrl = pathToFileURL(path.join(strategiesDirectory, fileName)).href;
      const imported = (await import(moduleUrl)) as { default?: ImportStrategy };

      if (!imported.default) {
        throw new Error(`Strategy file ${fileName} does not export a default strategy.`);
      }

      return imported.default;
    }),
  );

  return modules.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

export async function loadStrategies(): Promise<ImportStrategy[]> {
  cachedStrategiesPromise ??= loadStrategiesInternal();
  return cachedStrategiesPromise;
}
