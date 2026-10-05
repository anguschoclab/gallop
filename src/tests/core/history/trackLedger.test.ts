import { describe, it, expect } from "vitest";
import {
  appendTrackLedger,
  buildTrackLedgerEntry,
  filterTrackLedger,
  racesAtTrack,
  stablePrestigeAtTrack,
  summarizeTrackLedger,
  trackLedgerStableOptions,
  PLAYER_LEDGER_STABLE_ID,
  type TrackLedgerEntry,
} from "@/core/history/trackLedger";
import type { Horse, Race } from "@/game/types";
import type { Stable } from "@/core/stable/types";
import { TRACKS } from "@/core/data/tracksAccessor";
import { asNpcStableId } from "@/core/types/branded";

const TRACK = TRACKS[0]!;

function horse(id: string, name: string, ownership: Horse["ownership"]): Horse {
  return { id, name, ownership, raceHistory: [] } as unknown as Horse;
}

function race(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Stakes",
    day: 40,
    distance: 1600,
    raceClass: "allowance",
    entryFee: 0,
    purse: 100000,
    fieldSize: 4,
    entries: [],
    resolved: true,
    trackId: TRACK.id,
    surface: "Turf",
    ...overrides,
  } as unknown as Race;
}

const stableId = asNpcStableId("stable-a");

function fixture(overrides: Partial<Race> = {}) {
  const horses = new Map<string, Horse>([
    ["h1", horse("h1", "Player Colt", { type: "player" })],
    ["h2", horse("h2", "Rival Filly", { type: "npc", stableId })],
    ["h3", horse("h3", "Free Agent", { type: "unowned" })],
  ]);
  const stables = new Map<string, Stable>([
    [stableId, { id: stableId, name: "Rival Yard" } as unknown as Stable],
  ]);
  const result = [
    { horseId: "h1", position: 1, time: 95.2 },
    { horseId: "h2", position: 2, time: 95.8 },
    { horseId: "h3", position: 3, time: 96.4 },
  ];
  return { horses, stables, result, r: race(overrides) };
}

describe("trackLedger", () => {
  it("records the winner, time and prestige movement per stable", () => {
    const { horses, stables, result, r } = fixture();
    const entry = buildTrackLedgerEntry(r, result, horses, stables, "My Stable", r.day)!;

    expect(entry.trackId).toBe(TRACK.id);
    expect(entry.trackName).toBe(TRACK.name);
    expect(entry.winnerName).toBe("Player Colt");
    expect(entry.winnerIsPlayer).toBe(true);
    expect(entry.winnerStableName).toBe("My Stable");
    expect(entry.time).toBeCloseTo(95.2);
    expect(entry.runnerUpName).toBe("Rival Filly");

    const player = entry.prestigeDeltas.find((d) => d.stableId === PLAYER_LEDGER_STABLE_ID)!;
    const rival = entry.prestigeDeltas.find((d) => d.stableId === stableId)!;
    expect(player.delta).toBeGreaterThan(rival.delta);
    expect(rival.delta).toBeGreaterThan(0);
    // Unowned runners belong to no stable.
    expect(entry.prestigeDeltas).toHaveLength(2);
  });

  it("awards more prestige for a Grade 1 win than an ungraded win", () => {
    const { horses, stables, result } = fixture();
    const plain = buildTrackLedgerEntry(race(), result, horses, stables, "My Stable", 40)!;
    const g1 = buildTrackLedgerEntry(
      race({
        id: "race-2",
        graded: { key: "k", grade: "G1", track: TRACK.name, trackId: TRACK.id, surface: "Turf" },
      }),
      result,
      horses,
      stables,
      "My Stable",
      40,
    )!;
    const deltaOf = (e: TrackLedgerEntry) =>
      e.prestigeDeltas.find((d) => d.stableId === PLAYER_LEDGER_STABLE_ID)!.delta;
    expect(deltaOf(g1)).toBeGreaterThan(deltaOf(plain));
  });

  it("returns null without a track or a winner", () => {
    const { horses, stables, result } = fixture();
    expect(
      buildTrackLedgerEntry(
        race({ trackId: undefined }),
        result,
        horses,
        stables,
        "My Stable",
        40,
      ),
    ).toBeNull();
    expect(
      buildTrackLedgerEntry(race(), [{ horseId: "h2", position: 2, time: 95 }], horses, stables, "My Stable", 40),
    ).toBeNull();
  });

  it("appends without duplicating a race and summarizes per course", () => {
    const { horses, stables, result, r } = fixture();
    const entry = buildTrackLedgerEntry(r, result, horses, stables, "My Stable", r.day)!;
    const once = appendTrackLedger(undefined, [entry]);
    const twice = appendTrackLedger(once, [entry]);
    expect(twice).toHaveLength(1);

    const second = buildTrackLedgerEntry(
      race({ id: "race-3", day: 55 }),
      result,
      horses,
      stables,
      "My Stable",
      55,
    )!;
    const ledger = appendTrackLedger(twice, [second]);

    const [summary] = summarizeTrackLedger(ledger);
    expect(summary.raceCount).toBe(2);
    expect(summary.playerWins).toBe(2);
    expect(summary.firstDay).toBe(40);
    expect(summary.lastDay).toBe(55);

    expect(racesAtTrack(ledger, TRACK.id)[0]!.day).toBe(55);

    const rows = stablePrestigeAtTrack(ledger, TRACK.id);
    expect(rows[0]!.stableId).toBe(PLAYER_LEDGER_STABLE_ID);
    expect(rows[0]!.races).toBe(2);
    expect(rows[0]!.wins).toBe(2);
  });

  it("filters by day range, race type and participating stable together", () => {
    const { horses, stables, result } = fixture();
    const maiden = buildTrackLedgerEntry(
      race({ id: "maiden", day: 20, raceClass: "Maiden" }),
      result,
      horses,
      stables,
      "My Stable",
      20,
    )!;
    const allowance = buildTrackLedgerEntry(
      race({ id: "allowance", day: 60, raceClass: "Allowance" }),
      result,
      horses,
      stables,
      "My Stable",
      60,
    )!;
    const rivalOnly = {
      ...allowance,
      raceId: "rival-only",
      day: 70,
      prestigeDeltas: allowance.prestigeDeltas.filter((delta) => !delta.isPlayer),
    };

    expect(
      filterTrackLedger([maiden, allowance, rivalOnly], {
        fromDay: 40,
        toDay: 65,
        raceType: "Allowance",
        stableId: PLAYER_LEDGER_STABLE_ID,
      }).map((entry) => entry.raceId),
    ).toEqual(["allowance"]);
  });

  it("lists represented stables with the player first and no duplicates", () => {
    const { horses, stables, result, r } = fixture();
    const entry = buildTrackLedgerEntry(r, result, horses, stables, "My Stable", r.day)!;

    expect(trackLedgerStableOptions([entry, entry])).toEqual([
      { stableId: PLAYER_LEDGER_STABLE_ID, stableName: "My Stable", isPlayer: true },
      { stableId, stableName: "Rival Yard", isPlayer: false },
    ]);
  });
});
