import { describe, it, expect, vi } from "vitest";
import { recordDailyProgress, DAILY_PROGRESS_MAX_ENTRIES } from "@/core/horse/dailyProgress";
import type { Horse } from "@/core/horse/types";

vi.mock("@/core/horse/pricing", () => ({
  horseMarketValue: vi.fn(() => 10000),
}));

describe("dailyProgress", () => {
  it("snapshots player horses and ignores NPC horses", () => {
    const playerHorse = {
      id: "player1",
      ownership: { type: "player" },
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 },
      form: 100,
      energy: 100,
      lifecycleStatus: "active",
    } as unknown as Horse;

    const npcHorse = {
      id: "npc1",
      ownership: { type: "npc", stableId: "npc_stable_1" },
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 },
      form: 100,
      energy: 100,
      lifecycleStatus: "active",
    } as unknown as Horse;

    const horses = [playerHorse, npcHorse];

    const result = recordDailyProgress({}, horses, 1);

    expect(result["player1"]).toBeDefined();
    expect(result["player1"]).toHaveLength(1);
    expect(result["player1"]![0].day).toBe(1);
    expect(result["npc1"]).toBeUndefined();
  });

  it("limits snapshots to DAILY_PROGRESS_MAX_ENTRIES", () => {
    const playerHorse = {
      id: "player1",
      ownership: { type: "player" },
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 },
      form: 100,
      energy: 100,
      lifecycleStatus: "active",
    } as unknown as Horse;

    // Create 60 old entries
    const history = {
      player1: Array.from({ length: DAILY_PROGRESS_MAX_ENTRIES }, (_, i) => ({
        day: i - 60,
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        ovr: 50,
        form: 100,
        energy: 100,
        price: 10000,
      })),
    };

    const result = recordDailyProgress(history, [playerHorse], 1);

    expect(result["player1"]).toHaveLength(DAILY_PROGRESS_MAX_ENTRIES);
    // the oldest entry should be gone, and day 1 should be the last entry
    expect(result["player1"]![DAILY_PROGRESS_MAX_ENTRIES - 1].day).toBe(1);
  });

  it("drops horses that are no longer active player horses", () => {
    // If a horse dies or is sold, they shouldn't get a NEW snapshot, but their old ones are still in history if we passed it in.
    // WAIT: The code does NOT copy over history for horses not in `horses` or horses that skip the loop.
    const deadHorse = {
      id: "dead1",
      ownership: { type: "player" },
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 },
      form: 100,
      energy: 100,
      lifecycleStatus: "deceased",
    } as unknown as Horse;

    const history = {
      dead1: [
        {
          day: 0,
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          ovr: 50,
          form: 100,
          energy: 100,
          price: 10000,
        },
      ],
    };

    const result = recordDailyProgress(history, [deadHorse], 1);
    expect(result["dead1"]).toBeUndefined();
  });
});
