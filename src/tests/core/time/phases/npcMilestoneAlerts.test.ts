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
    expect(
      result.impacts.some(
        (i) =>
          i.type === "inbox_message" &&
          /passes/.test((i as { message?: { title?: string } }).message?.title ?? ""),
      ),
    ).toBe(true);

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

function gradedWin(day: number) {
  return {
    raceId: `r${day}`,
    raceName: "Graded Stakes",
    position: 1,
    day,
    grade: "G1",
    purseEarned: 100_000,
  };
}

function playerHorse(overrides: Partial<Horse> = {}): Horse {
  // createTestHorse is player-owned by default
  return {
    ...createTestHorse({ id: "player-1", name: "My Champ" }),
    raceHistory: [],
    ...overrides,
  } as Horse;
}

function stateWith(horse: Horse | Horse[], notifications?: GameState["userSettings"]): GameState {
  const state = makeGameState({ horses: h2r(Array.isArray(horse) ? horse : [horse]) }) as GameState;
  if (notifications) state.userSettings = notifications;
  return state;
}

describe("player milestone alerts", () => {
  it("emits inbox alerts for the player's own milestones with a View horse CTA", () => {
    const h = playerHorse({ age: 3, raceHistory: [gradedWin(5)] });
    const result = npcMilestoneAlertsPhase.execute(contextFor(stateWith(h)));
    expect(inboxCount(result)).toBe(2); // debut + breakthrough_win
    const titles = result.impacts.map(
      (i) => (i as { message?: { title?: string } }).message?.title ?? "",
    );
    expect(titles.some((t) => /debut/i.test(t))).toBe(true);
    expect(titles.some((t) => /breaks through/i.test(t))).toBe(true);
    const cta = (
      result.impacts[0] as {
        message?: { cta?: { route?: string; params?: Record<string, string> } };
      }
    ).message?.cta;
    expect(cta?.route).toBe("/stable/$horseId");
    expect(cta?.params?.horseId).toBe("player-1");
    expect(result.state.horses["player-1"].careerMilestonesAnnounced).toEqual(
      expect.arrayContaining(["debut", "breakthrough_win"]),
    );
  });

  it("respects per-kind player toggles — muted kinds are suppressed but still recorded", () => {
    const h = playerHorse({ age: 3, raceHistory: [gradedWin(5)] });
    const settings = createDefaultUserSettings(10);
    settings.notifications.playerMilestoneAlerts = { ...ALL_MUTED, breakthrough_win: true };
    const result = npcMilestoneAlertsPhase.execute(contextFor(stateWith(h, settings)));
    expect(inboxCount(result)).toBe(1);
    const keys = result.state.horses["player-1"].careerMilestonesAnnounced ?? [];
    expect(keys).toEqual(expect.arrayContaining(["debut", "breakthrough_win"]));
    // and stays silent on subsequent days
    const again = npcMilestoneAlertsPhase.execute(
      contextFor(stateWith({ ...h, careerMilestonesAnnounced: keys }, settings)),
    );
    expect(inboxCount(again)).toBe(0);
  });

  it("caps the backlog at 8 alerts per day and keeps remaining keys pending", () => {
    // debut + breakthrough_win + 5 earnings thresholds + stage_prime = 8
    const rich = playerHorse({
      id: "player-1",
      age: 5,
      peakAge: 5,
      lifetimeEarnings: 5_500_000,
      raceHistory: [gradedWin(5)],
    });
    // debut + retirement = 2 — both should overflow the daily cap
    const retired = playerHorse({
      id: "player-2",
      age: 8,
      lifecycleStatus: "retired",
      raceHistory: [{ ...gradedWin(3), grade: undefined, position: 4, purseEarned: 0 }],
    });
    const first = npcMilestoneAlertsPhase.execute(contextFor(stateWith([rich, retired])));
    expect(inboxCount(first)).toBe(8);
    const richKeys = first.state.horses["player-1"].careerMilestonesAnnounced ?? [];
    expect(richKeys.length).toBe(8);
    // overflowed horse records nothing, so its milestones fire on a later day
    expect(first.state.horses["player-2"].careerMilestonesAnnounced ?? []).toHaveLength(0);
    const second = npcMilestoneAlertsPhase.execute(
      contextFor(stateWith([{ ...rich, careerMilestonesAnnounced: richKeys }, retired])),
    );
    expect(inboxCount(second)).toBe(2);
  });

  it("enables all player milestone kinds in default settings", () => {
    const p = createDefaultUserSettings(10).notifications.playerMilestoneAlerts!;
    expect(p.debut && p.breakthrough_win && p.earnings && p.peak_transition && p.retirement).toBe(
      true,
    );
  });
});
