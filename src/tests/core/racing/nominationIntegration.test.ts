/**
 * Integration tests for nomination store actions (nominateHorse, withdrawNomination).
 *
 * Tests the business logic in racingSlice.ts that wraps the pure functions
 * from nominationFees.ts — including validation, cash deduction, record
 * creation, and status transitions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";
import {
  NOMINATION_FEE_G1_EARLY,
  NOMINATION_FEE_G1_STANDARD,
  NOMINATION_FEE_G2_EARLY,
  NOMINATION_FEE_G2_STANDARD,
  NOMINATION_FEE_G2_LATE,
  NOMINATION_FEE_G3_EARLY,
  NOMINATION_FEE_G3_STANDARD,
  NOMINATION_FEE_G3_LATE,
} from "@/core/racing/nominationFees";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function makeGradedRace(
  id: string,
  day: number,
  grade: "G1" | "G2" | "G3",
  overrides: Partial<Race> = {},
): Race {
  return {
    id,
    name: `Test ${grade} Race`,
    day,
    distance: 2000,
    raceClass: "Stakes",
    entryFee: 500,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    graded: { grade },
    ...overrides,
  } as Race;
}

function setState(state: {
  day?: number;
  cash?: number;
  horses?: Record<string, Horse>;
  races?: Record<string, Race>;
  playerNominations?: any[];
}) {
  useGame.setState({
    day: state.day ?? 10,
    cash: state.cash ?? 100000,
    horses: state.horses ?? {},
    races: state.races ?? {},
    playerNominations: state.playerNominations ?? [],
    log: [],
  } as any);
}

describe("nominateHorse — success cases", () => {
  beforeEach(() => setState({}));

  it("succeeds for G1 early tier with sufficient cash", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 110, "G1");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(true);

    const noms = (useGame.getState() as any).playerNominations;
    expect(noms).toHaveLength(1);
    expect(noms[0].grade).toBe("G1");
    expect(noms[0].tier).toBe("early");
    expect(noms[0].feePaid).toBe(NOMINATION_FEE_G1_EARLY);
  });

  it("succeeds for G2 standard tier", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 50, "G2");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(true);

    const noms = (useGame.getState() as any).playerNominations;
    expect(noms[0].grade).toBe("G2");
    expect(noms[0].tier).toBe("standard");
    expect(noms[0].feePaid).toBe(NOMINATION_FEE_G2_STANDARD);
  });

  it("succeeds for G3 late tier", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 20, "G3");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(true);

    const noms = (useGame.getState() as any).playerNominations;
    expect(noms[0].grade).toBe("G3");
    expect(noms[0].tier).toBe("late");
    expect(noms[0].feePaid).toBe(NOMINATION_FEE_G3_LATE);
  });
});

describe("nominateHorse — failure cases", () => {
  beforeEach(() => setState({}));

  it("fails when race not found", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    setState({ horses: h2r([horse]), races: {} });

    const result = useGame.getState().nominateHorse("h1", "nonexistent");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Race not found");
  });

  it("fails when race is not graded", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 50, "G1", { graded: undefined });
    setState({ horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not a graded stakes race");
  });

  it("fails when horse not owned", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "unowned" } });
    const race = makeGradedRace("r1", 50, "G1");
    setState({ horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("do not own");
  });

  it("fails on duplicate active nomination", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 50, "G1");
    setState({
      day: 10,
      cash: 100000,
      horses: h2r([horse]),
      races: r2r([race]),
      playerNominations: [
        {
          id: "nom-existing",
          horseId: "h1",
          raceId: "r1",
          raceName: "Test G1 Race",
          raceDay: 50,
          grade: "G1",
          tier: "standard",
          feePaid: NOMINATION_FEE_G1_STANDARD,
          nominatedDay: 5,
          status: "active",
        },
      ],
    });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("already nominated");
  });

  it("fails when race day has passed", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 5, "G1");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("passed");
  });

  it("fails for G1 late tier (null fee)", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 20, "G1");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("closed");
  });

  it("fails with insufficient cash", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 110, "G1");
    setState({ day: 10, cash: 100, horses: h2r([horse]), races: r2r([race]) });

    const result = useGame.getState().nominateHorse("h1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Insufficient cash");
  });
});

describe("nominateHorse — side effects", () => {
  beforeEach(() => setState({}));

  it("deducts correct fee from cash", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 110, "G1");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    useGame.getState().nominateHorse("h1", "r1");
    expect((useGame.getState() as any).cash).toBe(100000 - NOMINATION_FEE_G1_EARLY);
  });

  it("creates NominationRecord with correct fields", () => {
    const horse = createTestHorse({ id: "h1", name: "Runner", ownership: { type: "player" } });
    const race = makeGradedRace("r1", 110, "G2");
    setState({ day: 10, cash: 100000, horses: h2r([horse]), races: r2r([race]) });

    useGame.getState().nominateHorse("h1", "r1");
    const nom = (useGame.getState() as any).playerNominations[0];

    expect(nom.horseId).toBe("h1");
    expect(nom.raceId).toBe("r1");
    expect(nom.raceName).toBe("Test G2 Race");
    expect(nom.raceDay).toBe(110);
    expect(nom.grade).toBe("G2");
    expect(nom.tier).toBe("early");
    expect(nom.feePaid).toBe(NOMINATION_FEE_G2_EARLY);
    expect(nom.nominatedDay).toBe(10);
    expect(nom.status).toBe("active");
    expect(nom.id).toMatch(/^nom-/);
  });
});

describe("withdrawNomination", () => {
  beforeEach(() => setState({}));

  it("transitions status to scratched", () => {
    setState({
      day: 10,
      cash: 100000,
      playerNominations: [
        {
          id: "nom-1",
          horseId: "h1",
          raceId: "r1",
          raceName: "Test Race",
          raceDay: 50,
          grade: "G1",
          tier: "early",
          feePaid: 2000,
          nominatedDay: 5,
          status: "active",
        },
      ],
    });

    useGame.getState().withdrawNomination("nom-1");
    const nom = (useGame.getState() as any).playerNominations[0];
    expect(nom.status).toBe("scratched");
  });

  it("does not refund fee", () => {
    setState({
      day: 10,
      cash: 50000,
      playerNominations: [
        {
          id: "nom-1",
          horseId: "h1",
          raceId: "r1",
          raceName: "Test Race",
          raceDay: 50,
          grade: "G1",
          tier: "early",
          feePaid: 2000,
          nominatedDay: 5,
          status: "active",
        },
      ],
    });

    useGame.getState().withdrawNomination("nom-1");
    expect((useGame.getState() as any).cash).toBe(50000);
  });

  it("only affects the targeted nomination", () => {
    setState({
      day: 10,
      cash: 50000,
      playerNominations: [
        {
          id: "nom-1",
          horseId: "h1",
          raceId: "r1",
          raceName: "Race A",
          raceDay: 50,
          grade: "G1",
          tier: "early",
          feePaid: 2000,
          nominatedDay: 5,
          status: "active",
        },
        {
          id: "nom-2",
          horseId: "h2",
          raceId: "r2",
          raceName: "Race B",
          raceDay: 60,
          grade: "G2",
          tier: "standard",
          feePaid: 2000,
          nominatedDay: 5,
          status: "active",
        },
      ],
    });

    useGame.getState().withdrawNomination("nom-1");
    const noms = (useGame.getState() as any).playerNominations;
    expect(noms[0].status).toBe("scratched");
    expect(noms[1].status).toBe("active");
  });
});
