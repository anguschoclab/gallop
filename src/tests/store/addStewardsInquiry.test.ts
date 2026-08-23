import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import type { Race } from "@/game/types";
import { asRaceId } from "@/core/types/branded";

function makeInquiry(overrides: Partial<StewardsInquiry> = {}): StewardsInquiry {
  return {
    id: "inq-1",
    raceId: "race-1",
    day: 1,
    type: "interference",
    status: "resolved",
    outcome: "warning",
    accusedHorseId: "horse-A",
    description: "Test inquiry",
    resolvedDay: 1,
    ...overrides,
  };
}

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 5000,
    fieldSize: 6,
    resolved: true,
    result: [
      { horseId: "horse-A", position: 1, time: 96.0 },
      { horseId: "horse-B", position: 2, time: 96.5 },
    ],
    entries: [
      { horseId: "horse-A", ownership: { type: "player" } } as any,
      { horseId: "horse-B", ownership: { type: "unowned" } } as any,
    ],
    ...overrides,
  } as Race;
}

describe("addStewardsInquiry", () => {
  beforeEach(() => {
    // Reset store to a clean state with a race present
    useGame.setState({
      stewardsInquiries: [],
      inbox: [],
      races: { [asRaceId("race-1")]: makeRace() },
      jockeys: [{ id: "jockey-1", name: "Test Jockey", suspendedUntil: undefined } as any],
      day: 1,
    });
  });

  it("pushes inquiry to stewardsInquiries array", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    expect(useGame.getState().stewardsInquiries).toHaveLength(1);
    expect(useGame.getState().stewardsInquiries[0].id).toBe("inq-1");
  });

  it("attaches inquiry to race.inquiries (Bug 6)", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const race = useGame.getState().races[asRaceId("race-1")];
    expect(race.inquiries).toBeDefined();
    expect(race.inquiries).toHaveLength(1);
    expect(race.inquiries![0].id).toBe("inq-1");
  });

  it("applies jockey suspension when outcome is suspension (Bug 7)", () => {
    const inquiry = makeInquiry({
      outcome: "suspension",
      suspensionDays: 5,
      accusedJockeyId: "jockey-1",
    });
    useGame.getState().addStewardsInquiry(inquiry);
    const jockey = useGame.getState().jockeys?.find((j) => j.id === "jockey-1");
    expect(jockey?.suspendedUntil).toBe(6); // day 1 + 5 = 6
  });

  it("pushes an inbox message with category 'stewards'", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const inbox = useGame.getState().inbox;
    expect(inbox).toHaveLength(1);
    expect(inbox[0].category).toBe("stewards");
  });

  it("pushes an inbox message with priority 'urgent'", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.priority).toBe("urgent");
  });
});
