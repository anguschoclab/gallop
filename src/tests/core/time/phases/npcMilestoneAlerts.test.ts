import { describe, it, expect } from "vitest";
import { npcMilestoneAlertsPhase } from "@/core/time/phases/npcMilestoneAlertsPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import type { GameState, Horse } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { RivalMilestoneAlertSettings } from "@/core/settings/settingsTypes";

function rival(): Horse {
  return {
    ...createTestHorse({ id: "rival-1" }),
    ownership: { type: "npc", stableId: "stable-1" },
    name: "Rival Horse",
    fame: 40,
    age: 5,
    peakAge: 5,
    lifetimeEarnings: 300_000,
    raceHistory: [
      {
        raceId: "r1",
        raceName: "Derby",
        position: 1,
        day: 5,
        grade: "G2",
        purseEarned: 300_000,
      },
    ],
  } as Horse;
}

const ALL_MUTED: RivalMilestoneAlertSettings = {
  debut: false,
  breakthrough_win: false,
  earnings: false,
  peak_transition: false,
  retirement: false,
};

function contextFor(state: GameState): PipelineContext {
  return makePipelineContext({ state, newDay: 10 }) as PipelineContext;
}

function inboxCount(context: PipelineContext): number {
  return context.impacts.filter((i) => i.type === "inbox_message").length;
}

describe("npcMilestoneAlertsPhase", () => {
  it("emits every milestone kind when no mute settings exist", () => {
    const state = makeGameState({ horses: h2r([rival()]) }) as GameState;
    const result = npcMilestoneAlertsPhase.execute(contextFor(state));

    // debut, breakthrough_win, earnings_250000, stage_prime
    expect(inboxCount(result)).toBe(4);
    const keys = result.state.horses["rival-1"].careerMilestonesAnnounced ?? [];
    expect(keys).toEqual(
      expect.arrayContaining(["debut", "breakthrough_win", "earnings_250000", "stage_prime"]),
    );
  });

  it("skips muted kinds but still records them as announced", () => {
    const state = makeGameState({ horses: h2r([rival()]) }) as GameState;
    const settings = createDefaultUserSettings(10);
    settings.notifications.rivalMilestoneAlerts = { ...ALL_MUTED, earnings: true };
    state.userSettings = settings;

    const result = npcMilestoneAlertsPhase.execute(contextFor(state));

    expect(inboxCount(result)).toBe(1);
    expect(result.impacts.some((i) => i.type === "inbox_message" && /passes/.test(
      (i as { message?: { title?: string } }).message?.title ?? "",
    ))).toBe(true);

    // Muted milestones are recorded so unmuting later doesn't replay them.
    const keys = result.state.horses["rival-1"].careerMilestonesAnnounced ?? [];
    expect(keys).toEqual(
      expect.arrayContaining(["debut", "breakthrough_win", "earnings_250000", "stage_prime"]),
    );
  });

  it("emits nothing when every kind is muted", () => {
    const state = makeGameState({ horses: h2r([rival()]) }) as GameState;
    const settings = createDefaultUserSettings(10);
    settings.notifications.rivalMilestoneAlerts = ALL_MUTED;
    state.userSettings = settings;

    const result = npcMilestoneAlertsPhase.execute(contextFor(state));
    expect(inboxCount(result)).toBe(0);
    const keys = result.state.horses["rival-1"].careerMilestonesAnnounced ?? [];
    expect(keys.length).toBeGreaterThanOrEqual(4);
  });
});
