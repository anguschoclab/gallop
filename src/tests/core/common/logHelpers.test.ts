/**
 * Tests for shared log helpers.
 */

import { describe, it, expect } from "vitest";
import { prependLogEntry, prependLogEntries, DEFAULT_LOG_CAP } from "@/core/common/logHelpers";

describe("prependLogEntry", () => {
  it("prepends a new entry to an empty log", () => {
    const result = prependLogEntry([], 5, "Hello");
    expect(result).toEqual([{ day: 5, text: "Hello" }]);
  });

  it("prepends a new entry to an existing log", () => {
    const existing = [{ day: 4, text: "Old" }];
    const result = prependLogEntry(existing, 5, "New");
    expect(result).toEqual([
      { day: 5, text: "New" },
      { day: 4, text: "Old" },
    ]);
  });

  it("caps the log at the default cap", () => {
    const existing = Array.from({ length: DEFAULT_LOG_CAP + 10 }, (_, i) => ({
      day: i,
      text: `Entry ${i}`,
    }));
    const result = prependLogEntry(existing, 999, "New");
    expect(result).toHaveLength(DEFAULT_LOG_CAP);
    expect(result[0]).toEqual({ day: 999, text: "New" });
  });

  it("respects a custom cap", () => {
    const existing = [
      { day: 1, text: "A" },
      { day: 2, text: "B" },
      { day: 3, text: "C" },
    ];
    const result = prependLogEntry(existing, 4, "D", 2);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { day: 4, text: "D" },
      { day: 1, text: "A" },
    ]);
  });

  it("does not mutate the input array", () => {
    const existing = [{ day: 1, text: "A" }];
    const result = prependLogEntry(existing, 2, "B");
    expect(existing).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

describe("prependLogEntries", () => {
  it("prepends multiple entries in order", () => {
    const existing = [{ day: 1, text: "Old" }];
    const newEntries = [
      { day: 3, text: "C" },
      { day: 2, text: "B" },
    ];
    const result = prependLogEntries(existing, newEntries);
    expect(result).toEqual([
      { day: 3, text: "C" },
      { day: 2, text: "B" },
      { day: 1, text: "Old" },
    ]);
  });

  it("caps the total length", () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({ day: i, text: `E${i}` }));
    const newEntries = [{ day: 200, text: "New" }];
    const result = prependLogEntries(existing, newEntries, 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({ day: 200, text: "New" });
  });
});
