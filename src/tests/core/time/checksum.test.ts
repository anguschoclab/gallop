import { describe, it, expect } from "vitest";
import { checksumState, canonicalState } from "@/platform/time/checksum";
import { hashStr } from "@/shared/common/rng";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/platform/game/types";

describe("checksumState", () => {
  it("streaming hash matches hashStr over the canonical serialization", () => {
    const state = makeGameState({
      day: 5,
      cash: 1000,
      extra: new Map<string, unknown>([
        ["b", { nested: [1, 2, { deep: "x" }] }],
        ["a", new Set([3, 1, 2])],
      ]),
    } as never) as GameState;
    const expected = hashStr(canonicalState(state)).toString(16).padStart(8, "0");
    expect(checksumState(state)).toBe(expected);
  });

  it("produces identical checksums for key-order-shuffled states", () => {
    const a = makeGameState({ day: 5, cash: 1000 }) as GameState;
    const keys = Object.keys(a).reverse();
    const b = Object.fromEntries(keys.map((k) => [k, (a as any)[k]])) as GameState;
    expect(checksumState(a)).toBe(checksumState(b));
  });

  it("changes when simulation state changes", () => {
    const a = makeGameState({ day: 5, cash: 1000 }) as GameState;
    const b = { ...a, cash: 2000 };
    expect(checksumState(a)).not.toBe(checksumState(b));
  });

  it("ignores transient/presentation fields", () => {
    const a = makeGameState({ day: 5, cash: 1000 }) as GameState;
    const b = {
      ...a,
      log: [{ day: 5, text: "noise" }],
      execution: { status: "running", daysCompleted: 2, totalDays: 5 },
      lastFrameTime: 123,
    } as GameState;
    expect(checksumState(a)).toBe(checksumState(b));
  });

  it("handles Maps and Sets deterministically", () => {
    const base = makeGameState({ day: 1 }) as GameState;
    const withMapA = {
      ...base,
      extra: new Map([
        ["b", 2],
        ["a", 1],
      ]),
    } as unknown as GameState;
    const withMapB = {
      ...base,
      extra: new Map([
        ["a", 1],
        ["b", 2],
      ]),
    } as unknown as GameState;
    expect(checksumState(withMapA)).toBe(checksumState(withMapB));
  });

  it("canonical form handles non-finite numbers and undefined", () => {
    const s = canonicalState({
      a: NaN,
      b: Infinity,
      c: undefined,
      d: -Infinity,
    } as unknown as GameState);
    expect(s).toContain("num:NaN");
    expect(s).toContain("num:Infinity");
    expect(s).toContain("num:-Infinity");
    expect(s).toContain("undef");
  });
});
