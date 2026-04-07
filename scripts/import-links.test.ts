import { describe, expect, it } from "vitest";

import { __test__ } from "./import-links.ts";

describe("import-links CLI parsing", () => {
  it("treats a non-URL positional argument as output path", () => {
    const parsed = __test__.parseArgs(["--interactive", "--create", "src/data/locations.csv"]);

    expect(parsed.output).toBe("src/data/locations.csv");
    expect(parsed.urls).toEqual([]);
    expect(parsed.interactive).toBe(true);
    expect(parsed.create).toBe(true);
  });

  it("allows interactive mode without append or create flags", () => {
    const parsed = __test__.parseArgs(["--interactive", "src/data/locations.csv"]);

    expect(parsed.output).toBe("src/data/locations.csv");
    expect(parsed.urls).toEqual([]);
    expect(parsed.interactive).toBe(true);
    expect(parsed.append).toBe(false);
    expect(parsed.create).toBe(false);
  });
});
