import { describe, it, expect, vi } from "vitest";
import {
  snapshotHorse,
  recordDailyProgress,
  DAILY_PROGRESS_MAX_ENTRIES,
} from "@/core/horse/dailyProgress";
import { createTestHorse, createTestNpcHorse, createTestColt } from "@/tests/helpers/createTestHorse";
import * as pricing from "@/core/horse/pricing";

vi.mock("@/core/horse/pricing", () => ({
  horseMarketValue: vi.fn(() => 10000),
}));

describe("dailyProgress", () => {
  describe("snapshotHorse", () => {
    it("creates a snapshot rounding stats to 1 decimal place and energy to nearest integer", () => {
      const horse = createTestHorse({
        stats: {
          speed: 50.123,
          stamina: 60.55,
          acceleration: 70.99,
          consistency: 80.01,
          conformation: 50,
          temperament: 50,
        },
        form: 45.67,
        energy: 99.4,
      });

      const snapshot = snapshotHorse(horse, 10, [horse]);

      expect(snapshot).toEqual({
        day: 10,
        speed: 50.1,
        stamina: 60.6,
        acceleration: 71.0,
        consistency: 80.0,
        ovr: expect.any(Number),
        form: 45.7,
        energy: 99,
        price: 10000,
      });
    });
  });

  describe("recordDailyProgress", () => {
    it("records progress for player-owned horses that are alive and have stats", () => {
      const horse1 = createTestHorse({ id: "player-1" });
      const horse2 = createTestHorse({ id: "player-2" });
      const history = undefined;
      const horses = [horse1, horse2];

      const next = recordDailyProgress(history, horses, 5);

      expect(next["player-1"]).toHaveLength(1);
      expect(next["player-2"]).toHaveLength(1);
      expect(next["player-1"][0].day).toBe(5);
    });

    it("skips NPC-owned horses, unowned horses, and deceased horses", () => {
      const npcHorse = createTestNpcHorse({ id: "npc-1" });
      const deceasedHorse = createTestHorse({ id: "dead-1", lifecycleStatus: "deceased" });
      const noStatsHorse = createTestHorse({ id: "nostats-1", stats: null as any }); // simulate bad data
      const horses = [npcHorse, deceasedHorse, noStatsHorse];

      const next = recordDailyProgress({}, horses, 5);

      expect(Object.keys(next)).toHaveLength(0);
    });

    it("drops horses that were in history but are no longer owned by player", () => {
      const history = {
        "sold-horse": [{ day: 1, speed: 50, stamina: 50, acceleration: 50, consistency: 50, ovr: 50, form: 50, energy: 100, price: 1000 }],
        "kept-horse": [{ day: 1, speed: 50, stamina: 50, acceleration: 50, consistency: 50, ovr: 50, form: 50, energy: 100, price: 1000 }],
      };

      const keptHorse = createTestHorse({ id: "kept-horse" });
      // sold-horse is missing from current `horses` (or could be passed as npc-owned)
      const horses = [keptHorse];

      const next = recordDailyProgress(history, horses, 2);

      expect(next["kept-horse"]).toHaveLength(2); // day 1 + day 2
      expect(next["sold-horse"]).toBeUndefined(); // dropped because no longer player owned
    });

    it("replaces existing snapshot for the same day (idempotent)", () => {
      const horse = createTestHorse({ id: "horse-1" });
      const history = {
        "horse-1": [
          { day: 4, speed: 50, stamina: 50, acceleration: 50, consistency: 50, ovr: 50, form: 50, energy: 100, price: 1000 },
          { day: 5, speed: 40, stamina: 40, acceleration: 40, consistency: 40, ovr: 40, form: 40, energy: 80, price: 800 }, // old snapshot
        ],
      };

      const next = recordDailyProgress(history, [horse], 5); // same day 5

      expect(next["horse-1"]).toHaveLength(2); // day 4 and new day 5
      expect(next["horse-1"][1].day).toBe(5);
      expect(next["horse-1"][1].speed).not.toBe(40); // should be updated with new snapshot
    });

    it(`truncates history to max ${DAILY_PROGRESS_MAX_ENTRIES} entries per horse`, () => {
      const horse = createTestHorse({ id: "horse-1" });
      const history = {
        "horse-1": Array.from({ length: DAILY_PROGRESS_MAX_ENTRIES }, (_, i) => ({
          day: i, speed: 50, stamina: 50, acceleration: 50, consistency: 50, ovr: 50, form: 50, energy: 100, price: 1000
        }))
      };

      const next = recordDailyProgress(history, [horse], DAILY_PROGRESS_MAX_ENTRIES);

      expect(next["horse-1"]).toHaveLength(DAILY_PROGRESS_MAX_ENTRIES);
      expect(next["horse-1"][0].day).toBe(1); // day 0 was dropped
      expect(next["horse-1"][DAILY_PROGRESS_MAX_ENTRIES - 1].day).toBe(DAILY_PROGRESS_MAX_ENTRIES); // new day added
    });
  });
});
