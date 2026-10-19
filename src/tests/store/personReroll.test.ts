/**
 * personReroll.test.ts - Cosmetic reroll store actions: permissions + immutability
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/platform/game/store";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const silk = { pattern: "solid" as const, primary: "#f00", secondary: "#fff", cap: "#00f" };

function makeJockey(id: string, stableId?: string) {
  return {
    id,
    person: createStubPersonIdentity({ id, displayName: `Jockey ${id}` }),
    silk,
    stableId,
    careerWins: 7,
    fame: 40,
  } as any;
}

function makeStaff(id: string, stableId?: string) {
  return {
    id,
    person: createStubPersonIdentity({ id, displayName: `Staff ${id}` }),
    role: "trainer",
    tier: "mid",
    salary: 500,
    stableId,
  } as any;
}

describe("rerollPlayerOwnerAppearance", () => {
  beforeEach(() => {
    useGame.setState({
      playerProfile: {
        owner: createStubPersonIdentity({ id: "player", displayName: "Owner One" }),
        stableName: "Test Stable",
        silk,
      } as any,
    });
  });

  it("immutably replaces owner appearance, preserving everything else", () => {
    const before = useGame.getState().playerProfile!;
    const beforeRef = before;
    useGame.getState().rerollPlayerOwnerAppearance();
    const after = useGame.getState().playerProfile!;
    expect(after).not.toBe(beforeRef);
    expect(after.owner.appearance.revision).toBe(1);
    expect(after.owner.appearance).not.toEqual(before.owner.appearance);
    expect(after.owner.biography).toEqual(before.owner.biography);
    expect(after.stableName).toBe("Test Stable");
    expect(after.silk).toEqual(silk);
  });

  it("is a no-op without a player profile", () => {
    useGame.setState({ playerProfile: undefined as any });
    useGame.getState().rerollPlayerOwnerAppearance();
    expect(useGame.getState().playerProfile).toBeUndefined();
  });
});

describe("rerollJockeyAppearance", () => {
  beforeEach(() => {
    useGame.setState({
      jockeys: [
        makeJockey("j-player", "player"),
        makeJockey("j-academy", "player_academy"),
        makeJockey("j-npc", "rival-stable"),
        makeJockey("j-free", undefined),
      ],
    });
  });

  it("rerolls jockeys retained by the player", () => {
    const before = useGame.getState().jockeys![0];
    useGame.getState().rerollJockeyAppearance("j-player");
    const after = useGame.getState().jockeys![0];
    expect(after).not.toBe(before);
    expect(after.person.appearance.revision).toBe(1);
    expect(after.careerWins).toBe(7);
    expect(after.silk).toEqual(silk);
    expect(after.stableId).toBe("player");
  });

  it("rerolls academy jockeys", () => {
    useGame.getState().rerollJockeyAppearance("j-academy");
    expect(useGame.getState().jockeys![1].person.appearance.revision).toBe(1);
  });

  it("rejects NPC and free-agent jockeys", () => {
    const npc = useGame.getState().jockeys![2];
    const free = useGame.getState().jockeys![3];
    useGame.getState().rerollJockeyAppearance("j-npc");
    useGame.getState().rerollJockeyAppearance("j-free");
    expect(useGame.getState().jockeys![2]).toBe(npc);
    expect(useGame.getState().jockeys![3]).toBe(free);
  });

  it("is a no-op for unknown ids", () => {
    const before = useGame.getState().jockeys;
    useGame.getState().rerollJockeyAppearance("nonexistent");
    expect(useGame.getState().jockeys).toBe(before);
  });
});

describe("rerollStaffAppearance", () => {
  beforeEach(() => {
    useGame.setState({
      hiredStaff: [
        makeStaff("s-1", ""),
        makeStaff("s-2", "player"),
        makeStaff("s-3", "npc-stable"),
      ],
      staffPool: [makeStaff("pool-1")],
    });
  });

  it("rerolls player-hired staff only", () => {
    useGame.getState().rerollStaffAppearance("s-1");
    useGame.getState().rerollStaffAppearance("s-2");
    expect(useGame.getState().hiredStaff![0].person.appearance.revision).toBe(1);
    expect(useGame.getState().hiredStaff![1].person.appearance.revision).toBe(1);
    expect(useGame.getState().hiredStaff![0].role).toBe("trainer");
    expect(useGame.getState().hiredStaff![0].salary).toBe(500);
  });

  it("rejects NPC-stable staff and pool staff", () => {
    const npcStaff = useGame.getState().hiredStaff![2];
    const pool = useGame.getState().staffPool;
    useGame.getState().rerollStaffAppearance("s-3");
    useGame.getState().rerollStaffAppearance("pool-1");
    expect(useGame.getState().hiredStaff![2]).toBe(npcStaff);
    expect(useGame.getState().staffPool).toBe(pool);
  });
});
