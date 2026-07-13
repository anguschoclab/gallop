/**
 * foalDevelopmentPhase.test.ts — Inbox CTA emission and deep-link correctness.
 *
 * Verifies:
 *  - An inbox_message impact is emitted exactly on each milestone's triggerDay
 *    for player-owned foals.
 *  - The CTA route is /foal-development/$horseId with { horseId } params, so
 *    the inbox link deep-links into the correct horse resolution page.
 *  - The interpolated URL that inbox.tsx / UrgentMessagesStrip.tsx build from
 *    `route.replace(/\$(\w+)/g, ...)` resolves to /foal-development/<horseId>.
 *  - NPC horses and horses without an arc are ignored.
 */

import { describe, it, expect } from "vitest";
import { foalDevelopmentPhase } from "@/core/time/phases/foalDevelopmentPhase";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import { createTestHorse } from "@/tests/helpers";
import { createRng } from "@/core/common/rng";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { InboxImpact } from "@/core/resolver/impacts/index";

function makeContext(state: Partial<GameState>, newDay: number): PipelineContext {
  const fullState: GameState = {
    day: newDay,
    horses: [],
    npcStables: [],
    ...(state as any),
  } as GameState;
  return {
    previousDay: newDay - 1,
    newDay,
    state: fullState,
    logs: [],
    dailyRng: createRng("test"),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map((fullState.horses ?? []).map((h) => [h.id, h])),
    raceMap: new Map((fullState.races ?? []).map((r) => [r.id, r])),
    stableMap: new Map((fullState.npcStables ?? []).map((s) => [s.id, s])),
    jockeyMap: new Map((fullState.jockeys ?? []).map((j) => [j.id, j])),
  };
}

/** Mirrors the interpolation used by inbox.tsx and UrgentMessagesStrip.tsx. */
function interpolate(route: string, params?: Record<string, string>) {
  return route.replace(/\$(\w+)/g, (_, key) => params?.[key] ?? "");
}

describe("foalDevelopmentPhase — inbox CTA emission", () => {
  it("emits an inbox message on the breaking-in trigger day with a deep link to /foal-development/<horseId>", () => {
    const horse = createTestHorse({
      id: "foal-1",
      name: "Test Foal",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const ctx = makeContext({ horses: [horse] }, 18); // breaking_in trigger.
    const out = foalDevelopmentPhase.execute(ctx);

    const inbox = out.impacts.filter((i): i is InboxImpact => i.type === "inbox_message");
    expect(inbox).toHaveLength(1);

    const cta = inbox[0].message.cta;
    expect(cta).toBeDefined();
    expect(cta!.route).toBe("/foal-development/$horseId");
    expect(cta!.params).toEqual({ horseId: "foal-1" });
    expect(cta!.label).toMatch(/Resolve/i);

    // Inbox click handler builds the URL like this — verify the final URL.
    expect(interpolate(cta!.route, cta!.params)).toBe("/foal-development/foal-1");
  });

  it("emits again on the early-workouts trigger day for the same horse", () => {
    const horse = createTestHorse({
      id: "foal-2",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const ctx = makeContext({ horses: [horse] }, 24);
    const out = foalDevelopmentPhase.execute(ctx);

    const inbox = out.impacts.filter((i) => i.type === "inbox_message");
    expect(inbox).toHaveLength(1);
    const cta = (inbox[0] as InboxImpact).message.cta!;
    expect(interpolate(cta.route, cta.params)).toBe("/foal-development/foal-2");
  });

  it("emits nothing on a non-trigger day", () => {
    const horse = createTestHorse({
      id: "foal-1",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const ctx = makeContext({ horses: [horse] }, 17);
    const out = foalDevelopmentPhase.execute(ctx);
    expect(out.impacts.filter((i) => i.type === "inbox_message")).toHaveLength(0);
  });

  it("skips NPC horses even on their trigger day", () => {
    const horse = createTestHorse({
      id: "npc-foal",
      owned: false,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const ctx = makeContext({ horses: [horse] }, 18);
    const out = foalDevelopmentPhase.execute(ctx);
    expect(out.impacts).toHaveLength(0);
  });

  it("skips horses without a development arc", () => {
    const horse = createTestHorse({ id: "h", owned: true, developmentArc: undefined });
    const ctx = makeContext({ horses: [horse] }, 18);
    const out = foalDevelopmentPhase.execute(ctx);
    expect(out.impacts).toHaveLength(0);
  });

  it("does not re-emit for milestones already resolved", () => {
    const arc = createDefaultFoalDevelopmentArc(0);
    arc.milestones[0].status = "resolved";
    arc.milestones[0].resolvedChoiceKey = "bold_approach";
    const horse = createTestHorse({ id: "foal-1", owned: true, developmentArc: arc });
    const ctx = makeContext({ horses: [horse] }, 18);
    const out = foalDevelopmentPhase.execute(ctx);
    expect(out.impacts).toHaveLength(0);
  });

  it("targets each horse independently with its own params", () => {
    const a = createTestHorse({
      id: "foal-A",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const b = createTestHorse({
      id: "foal-B",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const ctx = makeContext({ horses: [a, b] }, 18);
    const out = foalDevelopmentPhase.execute(ctx);

    const urls = out.impacts
      .filter((i): i is InboxImpact => i.type === "inbox_message")
      .map((i) => interpolate(i.message.cta!.route, i.message.cta!.params));
    expect(urls.sort()).toEqual(["/foal-development/foal-A", "/foal-development/foal-B"]);
  });
});
