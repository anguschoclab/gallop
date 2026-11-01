import { describe, expect, it } from "vitest";
import {
  addNpcBooking,
  buildNpcBookings,
  canBookNpcStart,
  NPC_MIN_DAYS_BETWEEN_STARTS,
} from "@/domains/agents/simulation/npc/raceBooking";
import type { Race } from "@/platform/game/types";

const race = (id: string, day: number, horseIds: string[], extra: Partial<Race> = {}) =>
  ({ id, day, entries: horseIds.map((horseId) => ({ horseId })), resolved: false, ...extra }) as unknown as Race;

describe("rival horse race schedule", () => {
  it("a rival horse runs at most one race per day", () => {
    expect(NPC_MIN_DAYS_BETWEEN_STARTS).toBe(1);
    const b = buildNpcBookings([race("r1", 10, ["h"])]);
    expect(canBookNpcStart(b, { id: "h" }, 10)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 11)).toBe(true);
    expect(canBookNpcStart(b, { id: "h", lastRaceDay: 12 }, 12)).toBe(false);
  });

  it("a longer rest window blocks starts within it either side", () => {
    const b = buildNpcBookings([race("r1", 10, ["h"])]);
    expect(canBookNpcStart(b, { id: "h" }, 4, 7)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 16, 7)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 17, 7)).toBe(true);
    expect(canBookNpcStart(b, { id: "h", lastRaceDay: 5 }, 11, 7)).toBe(false);
  });

  it("ignores resolved and cancelled races", () => {
    const b = buildNpcBookings([
      race("r1", 10, ["h"], { resolved: true }),
      race("r2", 11, ["h"], { cancelled: true } as Partial<Race>),
    ]);
    expect(canBookNpcStart(b, { id: "h" }, 12)).toBe(true);
  });

  it("a new booking blocks the next race in the same window", () => {
    const b = buildNpcBookings([]);
    addNpcBooking(b, "h", 20);
    expect(canBookNpcStart(b, { id: "h" }, 20)).toBe(false);
  });

  it("player-entered races are filled first, then thin fields", async () => {
    const { prioritiseRacesForNpcEntry } = await import("@/domains/agents/simulation/npc/raceBooking");
    const full = race("full", 5, ["a", "b", "c", "d", "e"]);
    const thin = race("thin", 5, ["a"]);
    const mine = { ...race("mine", 6, []), entries: [{ horseId: "p", ownership: { type: "player" } }] } as unknown as Race;
    expect(prioritiseRacesForNpcEntry([full, thin, mine], 4).map((r) => r.id)).toEqual(["mine", "thin", "full"]);
  });
});
