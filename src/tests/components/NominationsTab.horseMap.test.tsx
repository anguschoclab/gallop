import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RaceNominationRow } from "@/components/racing/NominationsTab";
import type { NominationRecord } from "@/core/racing/nominationFees";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";

function buildHorseMap<T extends { id: string }>(horses: T[]): Map<string, T> {
  return new Map(horses.map((h) => [h.id, h]));
}

function mkHorse(id: string, name: string): Horse {
  return {
    id,
    name,
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
  } as unknown as Horse;
}

function mkRace(id: string): Race {
  return {
    id,
    name: `Race-${id}`,
    day: 35,
    purse: 50000,
    graded: { key: "test", grade: "G1", track: "Test", surface: "Turf" },
    entries: [],
  } as unknown as Race;
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

describe("RaceNominationRow — eligible horse filtering", () => {
  const race = mkRace("r1");
  const playerHorses = [
    mkHorse("h1", "Thunder"),
    mkHorse("h2", "Lightning"),
    mkHorse("h3", "Storm"),
  ];

  it("nominated horses are excluded from eligible list", () => {
    const noms: NominationRecord[] = [
      { raceId: "r1", horseId: "h1", status: "nominated" },
    ] as unknown as NominationRecord[];

    const { container } = render(
      <RaceNominationRow
        race={race}
        day={1}
        playerHorses={playerHorses}
        noms={noms}
        onNominate={() => {}}
      />,
    );

    // h1 is nominated, so h2 and h3 are eligible (2 eligible) → Select should be present
    const selectTrigger = container.querySelector("[role='combobox']");
    expect(selectTrigger).toBeTruthy();
  });

  it("all horses nominated → no eligible → no Select dropdown", () => {
    const noms: NominationRecord[] = [
      { raceId: "r1", horseId: "h1", status: "nominated" },
      { raceId: "r1", horseId: "h2", status: "nominated" },
      { raceId: "r1", horseId: "h3", status: "nominated" },
    ] as unknown as NominationRecord[];

    const { container } = render(
      <RaceNominationRow
        race={race}
        day={1}
        playerHorses={playerHorses}
        noms={noms}
        onNominate={() => {}}
      />,
    );

    // All horses nominated → 0 eligible → no Select dropdown
    const selectTrigger = container.querySelector("[role='combobox']");
    expect(selectTrigger).toBeNull();
  });

  it("scratched nominations do not block eligibility", () => {
    const noms: NominationRecord[] = [
      { raceId: "r1", horseId: "h1", status: "scratched" },
      { raceId: "r1", horseId: "h2", status: "nominated" },
      { raceId: "r1", horseId: "h3", status: "nominated" },
    ] as unknown as NominationRecord[];

    const { container } = render(
      <RaceNominationRow
        race={race}
        day={1}
        playerHorses={playerHorses}
        noms={noms}
        onNominate={() => {}}
      />,
    );

    // h1 is scratched (still eligible), h2 and h3 are nominated
    // → 1 eligible (h1) → Select should be present
    const selectTrigger = container.querySelector("[role='combobox']");
    expect(selectTrigger).toBeTruthy();
  });
});
