import { describe, it, expect } from "vitest";
import {
  asHorseId,
  asStableId,
  asJockeyId,
  asRaceId,
  asPlayerOwnerId,
  asNpcStableId,
  asOwnerKey,
  type HorseId,
  type StableId,
  type JockeyId,
  type RaceId,
  type PlayerOwnerId,
  type NpcStableId,
  type OwnerKey,
} from "@/core/types/branded";
import { PLAYER_OWNER_ID } from "@/core/horse/ownership";

describe("branded types", () => {
  describe("casting helpers", () => {
    it("asHorseId produces a HorseId", () => {
      const id = asHorseId("horse-123");
      expect(id).toBe("horse-123");
    });

    it("asStableId produces a StableId", () => {
      const id = asStableId("stable-456");
      expect(id).toBe("stable-456");
    });

    it("asJockeyId produces a JockeyId", () => {
      const id = asJockeyId("jockey-789");
      expect(id).toBe("jockey-789");
    });

    it("asRaceId produces a RaceId", () => {
      const id = asRaceId("race-abc");
      expect(id).toBe("race-abc");
    });

    it("asPlayerOwnerId produces a PlayerOwnerId", () => {
      const id = asPlayerOwnerId("__player__");
      expect(id).toBe("__player__");
    });

    it("asNpcStableId produces an NpcStableId", () => {
      const id = asNpcStableId("npc-stable-1");
      expect(id).toBe("npc-stable-1");
    });

    it("asOwnerKey produces an OwnerKey", () => {
      const key = asOwnerKey("some-owner");
      expect(key).toBe("some-owner");
    });
  });

  describe("PLAYER_OWNER_ID", () => {
    it("has the correct value", () => {
      expect(PLAYER_OWNER_ID).toBe("__player__");
    });

    it("is a PlayerOwnerId", () => {
      const _typeCheck: PlayerOwnerId = PLAYER_OWNER_ID;
      expect(_typeCheck).toBe(PLAYER_OWNER_ID);
    });
  });

  describe("OwnerKey union", () => {
    it("accepts PlayerOwnerId", () => {
      const key: OwnerKey = PLAYER_OWNER_ID;
      expect(key).toBe("__player__");
    });

    it("accepts NpcStableId", () => {
      const npcId = asNpcStableId("npc-1");
      const key: OwnerKey = npcId;
      expect(key).toBe("npc-1");
    });
  });

  describe("compile-time type safety", () => {
    it("branded types are distinct at compile time", () => {
      // These assignments should fail at compile time if uncommented:
      // const h: HorseId = asStableId("test"); // Error
      // const s: StableId = asHorseId("test"); // Error
      // const j: JockeyId = asRaceId("test"); // Error
      // const r: RaceId = asJockeyId("test"); // Error

      // But they are all strings at runtime
      const h: HorseId = asHorseId("h1");
      const s: StableId = asStableId("s1");
      const j: JockeyId = asJockeyId("j1");
      const r: RaceId = asRaceId("r1");
      const p: PlayerOwnerId = asPlayerOwnerId("p1");
      const n: NpcStableId = asNpcStableId("n1");

      expect(typeof h).toBe("string");
      expect(typeof s).toBe("string");
      expect(typeof j).toBe("string");
      expect(typeof r).toBe("string");
      expect(typeof p).toBe("string");
      expect(typeof n).toBe("string");
    });
  });
});
