import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import process from "node:process";

import {
  applyFieldEdit,
  createImportDependencies,
  createManualRow,
  finalizeEditedRow,
  formatDryRun,
  formatInteractiveSummary,
  importUrl,
  mergeImportedRows,
  normalizeUrl,
  validateEditedRow,
  type EditableImportedLocationDraft,
  type ImportedLocationDraft,
} from "../src/lib/link-importer.ts";

type CliOptions = {
  append: boolean;
  create: boolean;
  dedupe: boolean;
  dryRun: boolean;
  interactive: boolean;
  output: string;
  urls: string[];
  inputFile?: string;
};

function looksLikeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function printUsage(): void {
  console.log(`Usage:
  npm run import:links -- --append --output src/data/locations.csv --urls "https://example.com https://example.org"
  npm run import:links -- --create --output data/trip.csv --input urls.txt [--dry-run]
  npm run import:links -- --interactive --append --output src/data/locations.csv
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    append: false,
    create: false,
    dedupe: true,
    dryRun: false,
    interactive: false,
    output: "src/data/locations.csv",
    urls: [],
  };
  const positionalArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--append") {
      options.append = true;
      continue;
    }

    if (arg === "--create") {
      options.create = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--interactive") {
      options.interactive = true;
      continue;
    }

    if (arg === "--no-dedupe") {
      options.dedupe = false;
      continue;
    }

    if (arg === "--output") {
      options.output = argv[index + 1] ?? options.output;
      index += 1;
      continue;
    }

    if (arg === "--input") {
      options.inputFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--urls") {
      const raw = argv[index + 1] ?? "";
      options.urls.push(...raw.split(/\s+/).filter(Boolean));
      index += 1;
      continue;
    }

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (!arg.startsWith("--")) {
      positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 0 && options.output === "src/data/locations.csv" && !looksLikeHttpUrl(positionalArgs[0])) {
    options.output = positionalArgs.shift() ?? options.output;
  }

  options.urls.push(...positionalArgs);

  if (options.append && options.create) {
    throw new Error("Choose exactly one of --append or --create.");
  }

  if (!options.interactive && options.append === options.create) {
    throw new Error("Choose exactly one of --append or --create.");
  }

  return options;
}

export const __test__ = {
  looksLikeHttpUrl,
  parseArgs,
};

async function readUrlsFromFile(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const importDependencies = createImportDependencies();

function printResults(rows: ImportedLocationDraft[], outputPath: string, dryRun: boolean): void {
  console.log(formatDryRun(rows));
  console.log("");
  console.log(dryRun ? `Dry run complete. No changes written to ${outputPath}.` : `Wrote ${rows.length} imported rows to ${outputPath}.`);
}

async function collectInteractiveUrls(existingUrls: string[]): Promise<string[]> {
  if (existingUrls.length > 0) {
    return existingUrls;
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const urls: string[] = [];

  console.log("Paste URLs, one per line. Submit an empty line to start review.");

  while (true) {
    const line = (await readline.question("> ")).trim();

    if (line === "") {
      break;
    }

    urls.push(line);
  }

  readline.close();
  return urls;
}

function toEditableRow(row: ImportedLocationDraft): EditableImportedLocationDraft {
  return { ...row };
}

async function promptForChoice(prompt: string, options: string[]): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    console.log(prompt);

    for (let index = 0; index < options.length; index += 1) {
      console.log(`${index + 1}. ${options[index]}`);
    }

    const response = (await readline.question("> ")).trim();
    const numericChoice = Number(response);

    if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= options.length) {
      readline.close();
      return options[numericChoice - 1];
    }
  }
}

async function promptToEditRow(row: EditableImportedLocationDraft): Promise<EditableImportedLocationDraft> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  let current = { ...row };
  const orderedFields: Array<
    keyof Pick<EditableImportedLocationDraft, "title" | "type" | "description" | "latitude" | "longitude" | "link" | "photo">
  > = [
    "title",
    "type",
    "description",
    "latitude",
    "longitude",
    "link",
    "photo",
  ];

  while (true) {
    for (const field of orderedFields) {
      const currentValue = current[field] ?? "";
      const answer = await readline.question(`${field} [${currentValue}]: `);

      if (answer.trim() === "") {
        continue;
      }

      current = applyFieldEdit(current, field, answer);
    }

    current = finalizeEditedRow(current);
    const errors = validateEditedRow(current);

    if (errors.length === 0) {
      readline.close();
      return current;
    }

    console.log(errors.join("\n"));
    console.log("Please review the fields again.");
  }
}

async function reviewInteractiveRow(row: ImportedLocationDraft): Promise<ImportedLocationDraft | undefined> {
  let currentRow = toEditableRow(row);

  if (currentRow.latitude !== undefined && currentRow.longitude !== undefined) {
    const finalized = finalizeEditedRow(currentRow);
    console.log("");
    console.log(formatInteractiveSummary(finalized));
    console.log("Auto-added complete row.");
    return finalized;
  }

  while (true) {
    console.log("");
    console.log(formatInteractiveSummary(currentRow));
    console.log("");

    const choice = await promptForChoice(
      "Coordinates are missing. Choose an action:",
      ["Add to Needs review", "Enter coordinates", "Edit", "Skip"],
    );

    if (choice === "Add to Needs review") {
      const finalized = finalizeEditedRow(currentRow);
      const errors = validateEditedRow(finalized);

      if (errors.length === 0) {
        return finalized;
      }

      console.log(errors.join("\n"));
      currentRow = await promptToEditRow(finalized);
      continue;
    }

    if (choice === "Edit") {
      currentRow = await promptToEditRow(currentRow);
      continue;
    }

    if (choice === "Enter coordinates") {
      currentRow = await promptToEditRow(currentRow);
      continue;
    }

    return undefined;
  }
}

async function reviewFailedImport(url: string, error: unknown): Promise<ImportedLocationDraft | undefined> {
  console.log("");
  console.log(`Import failed for ${url}`);
  console.log(error instanceof Error ? error.message : String(error));
  console.log("");

  const choice = await promptForChoice("Choose an action:", ["Skip", "Enter row manually"]);

  if (choice === "Skip") {
    return undefined;
  }

  const manualRow = await promptToEditRow(createManualRow(url));
  return finalizeEditedRow(manualRow);
}

async function runInteractiveImport(
  urls: string[],
  options: CliOptions,
): Promise<void> {
  const acceptedRows: ImportedLocationDraft[] = [];
  let skippedCount = 0;
  let autoAddedCount = 0;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    console.log(`\nReviewing ${index + 1}/${urls.length}: ${url}`);

    try {
      const imported = await importUrl(url, importDependencies);
      const reviewed = await reviewInteractiveRow(imported);

      if (reviewed) {
        acceptedRows.push(reviewed);

        if (reviewed.status === "complete") {
          autoAddedCount += 1;
        }
      } else {
        skippedCount += 1;
      }
    } catch (error) {
      const manual = await reviewFailedImport(url, error);

      if (manual) {
        acceptedRows.push(manual);
      } else {
        skippedCount += 1;
      }
    }

    if (index < urls.length - 1) {
      await importDependencies.delay?.(1100);
    }
  }

  if (acceptedRows.length === 0) {
    console.log("No rows selected. Nothing written.");
    return;
  }

  const outputPath = path.resolve(process.cwd(), options.output);
  const completeCount = acceptedRows.filter((row) => row.status === "complete").length;
  const pendingCount = acceptedRows.length - completeCount;

  console.log("");
  console.log(`Selected rows: ${acceptedRows.length}`);
  console.log(`Complete rows: ${completeCount}`);
  console.log(`Needs review rows: ${pendingCount}`);
  console.log(`Auto-added rows: ${autoAddedCount}`);
  console.log(`Skipped rows: ${skippedCount}`);
  console.log(`Output: ${outputPath}`);
  console.log("");

  let shouldAppend = options.append;

  if (!options.append && !options.create) {
    let outputExists = false;

    try {
      await access(outputPath);
      outputExists = true;
    } catch {
      outputExists = false;
    }

    if (outputExists) {
      const mode = await promptForChoice("How should the CSV be written?", ["Add lines", "Replace file", "Cancel"]);

      if (mode === "Cancel") {
        console.log("Cancelled. No changes written.");
        return;
      }

      shouldAppend = mode === "Add lines";
    } else {
      console.log("Output file does not exist yet. A new CSV will be created.");
      shouldAppend = false;
    }

    console.log("");
  }

  const confirmation = await promptForChoice("Write changes?", ["Write changes", "Cancel"]);

  if (confirmation !== "Write changes") {
    console.log("Cancelled. No changes written.");
    return;
  }

  const existingCsvText = shouldAppend ? await readFile(outputPath, "utf8") : undefined;
  const merged = mergeImportedRows(acceptedRows, {
    append: shouldAppend,
    dedupe: options.dedupe,
    existingCsvText,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, merged.csvText + "\n", "utf8");

  printResults(acceptedRows, outputPath, false);

  if (merged.skipped.length > 0) {
    console.log("");
    console.log("Skipped rows:");

    for (const skipped of merged.skipped) {
      console.log(`- ${skipped.row.link}: ${skipped.reason}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const urlsFromFile = options.inputFile ? await readUrlsFromFile(options.inputFile) : [];
  const rawUrls = options.interactive ? await collectInteractiveUrls([...options.urls, ...urlsFromFile]) : [...options.urls, ...urlsFromFile];
  const urls = options.interactive
    ? Array.from(new Set(rawUrls.map((value) => value.trim()).filter((value) => value !== "")))
    : Array.from(new Set(rawUrls.map((value) => normalizeUrl(value))));

  if (urls.length === 0) {
    throw new Error("Provide URLs via --urls, positional arguments, or --input.");
  }

  if (options.interactive) {
    await runInteractiveImport(urls, options);
    return;
  }

  const importedRows: ImportedLocationDraft[] = [];

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    console.log(`Importing ${index + 1}/${urls.length}: ${url}`);
    const row = await importUrl(url, importDependencies);
    importedRows.push(row);

    if (index < urls.length - 1) {
      await importDependencies.delay?.(1100);
    }
  }

  const outputPath = path.resolve(process.cwd(), options.output);
  const existingCsvText = options.append ? await readFile(outputPath, "utf8") : undefined;

  if (options.dryRun) {
    printResults(importedRows, outputPath, true);
    return;
  }

  const merged = mergeImportedRows(importedRows, {
    append: options.append,
    dedupe: options.dedupe,
    existingCsvText,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, merged.csvText + "\n", "utf8");

  printResults(importedRows, outputPath, false);

  if (merged.skipped.length > 0) {
    console.log("");
    console.log("Skipped rows:");

    for (const skipped of merged.skipped) {
      console.log(`- ${skipped.row.link}: ${skipped.reason}`);
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
