import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { useRaceEntry } from "@/hooks/race/useRaceEntry";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { Race } from "@/game/types";
import { asJockeyId } from "@/core/types/branded";

function claimingRace(): Race {
  return {
    id: "race-claiming",
    name: "Claiming Race",
    day: 10,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 500,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    claimingPrice: 25000,
  } as Race;
}

describe("useRaceEntry claiming flow", () => {
  it("recognizes canonical claimingPrice races without exposing a self-claim option", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 90 });
    const jockey = createTestJockey({ id: asJockeyId("jockey-1") });
    seedStore({ day: 1, horses: h2r([horse]), jockeys: [jockey] });

    const { result } = renderHook(() => useRaceEntry(claimingRace()));

    expect(result.current.isNewClaimingRace).toBe(true);
    expect(result.current.claimingPrice).toBe(25000);
    expect(result.current).not.toHaveProperty("wantToClaim");
    expect(result.current).not.toHaveProperty("setWantToClaim");
    expect(result.current).not.toHaveProperty("submitClaim");
  });
});
