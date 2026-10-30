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
  it("rest window is 7 days", () => {
    expect(NPC_MIN_DAYS_BETWEEN_STARTS).toBe(7);
  });

  it("a horse already entered on day 10 cannot run again on day 10 or within 7 days either side", () => {
    const b = buildNpcBookings([race("r1", 10, ["h"])]);
    expect(canBookNpcStart(b, { id: "h" }, 10)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 4)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 16)).toBe(false);
    expect(canBookNpcStart(b, { id: "h" }, 17)).toBe(true);
    expect(canBookNpcStart(b, { id: "h" }, 3)).toBe(true);
  });

  it("needs 7 days' rest after its last run", () => {
    const b = buildNpcBookings([]);
    expect(canBookNpcStart(b, { id: "h", lastRaceDay: 5 }, 11)).toBe(false);
    expect(canBookNpcStart(b, { id: "h", lastRaceDay: 5 }, 12)).toBe(true);
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
    expect(canBookNpcStart(b, { id: "h" }, 22)).toBe(false);
  });
});
