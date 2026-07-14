import { describe, it, expect } from "vitest";
import { requireHorse, requireOwned } from "@/game/store/guards";
import type { Horse } from "@/game/types";
import { h2r } from "@/tests/helpers/sampleGameState";

function makeHorse(id: string, owned: boolean): Horse {
  return { id, owned, name: id } as unknown as Horse;
}

describe("requireHorse", () => {
  it("returns horse when id matches", () => {
    const horses = h2r([makeHorse("h1", true), makeHorse("h2", false)]);
    expect(requireHorse(horses, "h1")).toBe(horses["h1"]);
  });

  it("returns undefined when no horse matches", () => {
    const horses = h2r([makeHorse("h1", true)]);
    expect(requireHorse(horses, "h99")).toBeUndefined();
  });

  it("returns correct horse from array of multiple", () => {
    const horses = h2r([makeHorse("h1", true), makeHorse("h2", false), makeHorse("h3", true)]);
    expect(requireHorse(horses, "h2")).toBe(horses["h2"]);
  });

  it("returns undefined for empty Record", () => {
    expect(requireHorse({}, "h1")).toBeUndefined();
  });
});

describe("requireOwned", () => {
  it("returns null when horse is owned", () => {
    expect(requireOwned(makeHorse("h1", true))).toBeNull();
  });

  it("returns error when horse is undefined", () => {
    expect(requireOwned(undefined)).toEqual({
      ok: false,
      reason: "Horse not found.",
    });
  });

  it("returns error when owned is false", () => {
    expect(requireOwned(makeHorse("h1", false))).toEqual({
      ok: false,
      reason: "You don't own this horse.",
    });
  });

  it("verify exact reason string for not found", () => {
    const result = requireOwned(undefined);
    expect(result?.reason).toBe("Horse not found.");
  });

  it("verify exact reason string for not owned", () => {
    const result = requireOwned(makeHorse("h1", false));
    expect(result?.reason).toBe("You don't own this horse.");
  });
});
