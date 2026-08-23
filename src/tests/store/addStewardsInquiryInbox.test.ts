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

describe("addStewardsInquiry — inbox message", () => {
  beforeEach(() => {
    useGame.setState({
      stewardsInquiries: [],
      inbox: [],
      races: { [asRaceId("race-1")]: makeRace() },
      jockeys: [{ id: "jockey-1", name: "Test Jockey", suspendedUntil: undefined } as any],
      day: 1,
    });
  });

  it("pushes an inbox message after adding inquiry", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const inbox = useGame.getState().inbox;
    expect(inbox).toHaveLength(1);
  });

  it("uses category 'stewards' for the inbox message", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.category).toBe("stewards");
  });

  it("uses priority 'urgent' for the inbox message", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.priority).toBe("urgent");
  });

  it("includes race name in the message title", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.title).toContain("Test Race");
  });

  it("includes inquiry description in the message body", () => {
    const inquiry = makeInquiry({ description: "Foul in the stretch run" });
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.body).toContain("Foul in the stretch run");
  });

  it("includes a CTA linking to the race", () => {
    const inquiry = makeInquiry();
    useGame.getState().addStewardsInquiry(inquiry);
    const msg = useGame.getState().inbox[0];
    expect(msg.cta).toBeDefined();
    expect(msg.cta?.label).toBe("View Race");
  });
});
