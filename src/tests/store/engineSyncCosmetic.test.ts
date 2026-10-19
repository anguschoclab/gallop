/**
 * engineSyncCosmetic.test.ts - Cosmetic store mutations invalidate engine sync
 *
 * engineWorldSynced compares top-level field identity with the engine's
 * committed world. A cosmetic reroll must immutably replace the affected
 * field so the next command ships a full resync — no resolver intent needed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/platform/game/store";
import {
  noteCommittedWorld,
  resetCommittedWorld,
  engineWorldSynced,
} from "@/platform/game/store/engineSync";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const silk = { pattern: "solid" as const, primary: "#f00", secondary: "#fff", cap: "#00f" };

function baseState() {
  return {
    playerProfile: {
      owner: createStubPersonIdentity({ id: "player", displayName: "Owner" }),
    } as any,
    jockeys: [
      {
        id: "j-1",
        person: createStubPersonIdentity({ id: "j-1" }),
        silk,
        stableId: "player",
      } as any,
    ],
    hiredStaff: [],
    log: [],
  };
}

describe("engineWorldSynced after cosmetic mutation", () => {
  beforeEach(() => {
    resetCommittedWorld();
    const state = baseState();
    useGame.setState(state);
    // Commit the exact state the engine would hold.
    noteCommittedWorld(useGame.getState() as any);
  });

  it("reports synced when nothing changed", () => {
    expect(engineWorldSynced(useGame.getState() as any)).toBe(true);
  });

  it("owner reroll invalidates sync via top-level identity change", () => {
    useGame.getState().rerollPlayerOwnerAppearance();
    expect(engineWorldSynced(useGame.getState() as any)).toBe(false);
  });

  it("jockey reroll invalidates sync via top-level identity change", () => {
    useGame.getState().rerollJockeyAppearance("j-1");
    expect(engineWorldSynced(useGame.getState() as any)).toBe(false);
  });
});
