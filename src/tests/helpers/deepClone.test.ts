import { describe, it, expect } from "vitest";
import { deepClone } from "@/tests/helpers";

describe("deepClone", () => {
  it("returns a deeply-equal copy", () => {
    const original = { a: 1, nested: { b: [1, 2, { c: "x" }] } };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it("isolates nested mutations from the original", () => {
    const original = { nested: { list: [1, 2, 3] }, name: "a" };
    const clone = deepClone(original);
    clone.nested.list.push(4);
    clone.name = "b";
    expect(original.nested.list).toEqual([1, 2, 3]);
    expect(original.name).toBe("a");
  });

  it("preserves undefined keys, Date, and Map values (unlike JSON round-trip)", () => {
    const original = {
      optional: undefined,
      when: new Date(2025, 0, 15),
      lookup: new Map([["k", 42]]),
    };
    const clone = deepClone(original);
    expect("optional" in clone).toBe(true);
    expect(clone.when).toBeInstanceOf(Date);
    expect(clone.when.getTime()).toBe(original.when.getTime());
    expect(clone.lookup).toBeInstanceOf(Map);
    expect(clone.lookup.get("k")).toBe(42);
  });

  it("throws on values containing functions", () => {
    const withFn = { ok: 1, fn: () => 2 };
    expect(() => deepClone(withFn)).toThrow();
  });
});
