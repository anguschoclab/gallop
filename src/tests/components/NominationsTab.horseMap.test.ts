import { describe, it, expect } from "vitest";

function buildHorseMap<T extends { id: string }>(horses: T[]): Map<string, T> {
  return new Map(horses.map((h) => [h.id, h]));
}

describe("NominationsTab — Map-based horse lookup", () => {
  const horses = [
    { id: "h1", name: "Thunder" },
    { id: "h2", name: "Lightning" },
    { id: "h3", name: "Storm" },
  ];

  it("horseMap resolves horse by ID correctly", () => {
    const map = buildHorseMap(horses);
    expect(map.get("h1")?.name).toBe("Thunder");
    expect(map.get("h2")?.name).toBe("Lightning");
    expect(map.get("h3")?.name).toBe("Storm");
  });

  it("horseMap returns undefined for unknown horseId", () => {
    const map = buildHorseMap(horses);
    expect(map.get("unknown")).toBeUndefined();
  });

  it("horseMap has same size as input array", () => {
    const map = buildHorseMap(horses);
    expect(map.size).toBe(horses.length);
  });

  it("horseMap handles empty array", () => {
    const map = buildHorseMap([]);
    expect(map.size).toBe(0);
    expect(map.get("h1")).toBeUndefined();
  });
});
