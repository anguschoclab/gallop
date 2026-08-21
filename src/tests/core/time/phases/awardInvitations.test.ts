/**
 * Integration tests for the award ceremony invitation phase.
 *
 * Verifies invitations are issued exactly CEREMONY_INVITE_LEAD_DAYS (14) days
 * before a regional ceremony, only for player top-3 Grade 1 finishes in that
 * region, and that RSVP status survives further invitation issuance.
 */

import { describe, it, expect } from "vitest";
import { awardInvitationsPhase } from "@/core/time/phases/awardInvitations";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultGameState } from "@/game/store/state";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { Horse, Race } from "@/game/types";
import {
  CEREMONY_INVITE_LEAD_DAYS,
  RSVP_DEADLINE_LEAD_DAYS,
  RSVP_REMINDER_MARKS,
  type AwardCeremonyInvitation,
} from "@/core/awards/invitations";

const EUROPE_CEREMONY_DOY = 314; // Cartier Racing Awards
const NA_CEREMONY_DOY = 365; // Eclipse Awards

function mkRace(id: string, track: string, day: number, grade = "G1"): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance: 2000,
    raceClass: "Graded",
    entryFee: 500,
    purse: 1000000,
    minStat: 80,
    fieldSize: 8,
    entries: [],
    resolved: true,
    graded: {
      key: `key-${id}`,
      grade: grade as never,
      track,
      trackId: `track-${id}`,
      surface: "Turf" as never,
    },
  } as unknown as Race;
}

function mkHorse(
  id: string,
  raceId: string,
  position: number,
  day: number,
  grade = "G1",
  overrides: Partial<Horse> = {},
): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    ownership: { type: "player" },
    raceHistory: [
      {
        raceId,
        raceName: `Race ${raceId}`,
        position,
        day,
        beyer: 115,
        grade: grade as never,
        distance: 2000,
        surface: "Turf" as never,
        purse: 1000000,
        fieldSize: 8,
      },
    ],
    ...overrides,
  } as Partial<Horse>);
}

function mkContext(newDay: number, horses: Horse[], races: Race[]): PipelineContext {
  const state: GameState = {
    ...createDefaultGameState(),
    day: newDay,
    horses: Object.fromEntries(horses.map((h) => [h.id, h])),
  };
  return {
    previousDay: newDay - 1,
    newDay,
    state,
    logs: [],
    intents: [],
    impacts: [],
    impactLog: [],
    dailyRng: createRng(1),
    horseMap: new Map(horses.map((h) => [h.id, h])),
    raceMap: new Map(races.map((r) => [r.id, r])),
    stableMap: new Map(),
    jockeyMap: new Map(),
  } as unknown as PipelineContext;
}

describe("awardInvitationsPhase (integration)", () => {
  const euroRace = mkRace("race-eu", "Ascot", 200);
  const naRace = mkRace("race-na", "Churchill Downs", 210);

  it("issues an invitation exactly 14 days before the regional ceremony", () => {
    const horse = mkHorse("h1", "race-eu", 2, 200);
    const inviteDay = EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS;

    const result = awardInvitationsPhase.execute(mkContext(inviteDay, [horse], [euroRace]));
    const invitations = result.state.awardCeremonyInvitations ?? [];

    expect(invitations).toHaveLength(1);
    expect(invitations[0].region).toBe("europe");
    expect(invitations[0].year).toBe(1);
    expect(invitations[0].ceremonyDay).toBe(EUROPE_CEREMONY_DOY);
    expect(invitations[0].issuedDay).toBe(inviteDay);
    expect(invitations[0].rsvp).toBe("pending");
    expect(result.impacts).toHaveLength(1);
  });

  it("issues nothing on the days around the 14-day lead window", () => {
    const horse = mkHorse("h1", "race-eu", 1, 200);
    for (const offset of [-1, 1, 5, 13, 15]) {
      const day = EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS + offset;
      const result = awardInvitationsPhase.execute(mkContext(day, [horse], [euroRace]));
      expect(result.state.awardCeremonyInvitations ?? []).toHaveLength(0);
    }
  });

  it("only invites for G1 finishes in the ceremony's own region", () => {
    const naHorse = mkHorse("h-na", "race-na", 1, 210);
    const inviteDay = EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS;

    // European ceremony, but the only placing was in North America
    const euroResult = awardInvitationsPhase.execute(mkContext(inviteDay, [naHorse], [naRace]));
    expect(euroResult.state.awardCeremonyInvitations ?? []).toHaveLength(0);

    // North American ceremony picks it up
    const naResult = awardInvitationsPhase.execute(
      mkContext(NA_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS, [naHorse], [naRace]),
    );
    const invitations = naResult.state.awardCeremonyInvitations ?? [];
    expect(invitations).toHaveLength(1);
    expect(invitations[0].region).toBe("north_america");
    expect(invitations[0].qualifiers[0].horseId).toBe("h-na");
  });

  it("ignores finishes outside the top 3 and non-G1 races", () => {
    const inviteDay = EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS;

    const fourth = mkHorse("h4", "race-eu", 4, 200);
    expect(
      awardInvitationsPhase.execute(mkContext(inviteDay, [fourth], [euroRace])).state
        .awardCeremonyInvitations ?? [],
    ).toHaveLength(0);

    const g2Race = mkRace("race-g2", "Ascot", 200, "G2");
    const g2Winner = mkHorse("h-g2", "race-g2", 1, 200, "G2");
    expect(
      awardInvitationsPhase.execute(mkContext(inviteDay, [g2Winner], [g2Race])).state
        .awardCeremonyInvitations ?? [],
    ).toHaveLength(0);
  });

  it("ignores NPC-owned horses", () => {
    const npcHorse = mkHorse("h-npc", "race-eu", 1, 200, "G1", {
      stableId: "npc-1",
    } as Partial<Horse>);
    const result = awardInvitationsPhase.execute(
      mkContext(EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS, [npcHorse], [euroRace]),
    );
    expect(result.state.awardCeremonyInvitations ?? []).toHaveLength(0);
  });

  it("collects every qualifying placing for the region", () => {
    const secondEuroRace = mkRace("race-eu2", "Ascot", 240);
    const h1 = mkHorse("h1", "race-eu", 1, 200);
    const h2 = mkHorse("h2", "race-eu2", 3, 240);
    const result = awardInvitationsPhase.execute(
      mkContext(
        EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS,
        [h1, h2],
        [euroRace, secondEuroRace],
      ),
    );
    const invitations = result.state.awardCeremonyInvitations ?? [];
    expect(invitations).toHaveLength(1);
    expect(invitations[0].qualifiers).toHaveLength(2);
    // newest first
    expect(invitations[0].qualifiers[0].horseId).toBe("h2");
  });

  it("does not duplicate an invitation for the same region and year", () => {
    const horse = mkHorse("h1", "race-eu", 1, 200);
    const inviteDay = EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS;
    const first = awardInvitationsPhase.execute(mkContext(inviteDay, [horse], [euroRace]));

    const context = mkContext(inviteDay, [horse], [euroRace]);
    const existing = (first.state.awardCeremonyInvitations ?? []).map((i) => ({
      ...i,
      rsvp: "attending" as const,
    }));
    const second = awardInvitationsPhase.execute({
      ...context,
      state: { ...context.state, awardCeremonyInvitations: existing },
    });

    const invitations = second.state.awardCeremonyInvitations ?? [];
    expect(invitations).toHaveLength(1);
    expect(invitations[0].rsvp).toBe("attending");
  });

  it("includes a ceremony CTA that deep-links to the invitation", () => {
    const horse = mkHorse("h1", "race-eu", 1, 200);
    const result = awardInvitationsPhase.execute(
      mkContext(EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS, [horse], [euroRace]),
    );
    const impact = result.impacts[0] as {
      message: {
        cta?: { route: string; params?: Record<string, string> };
        secondaryCta?: { label: string; route: string };
      };
    };
    const invitationId = (result.state.awardCeremonyInvitations ?? [])[0].id;
    expect(impact.message.cta?.route).toBe("/ceremony/$invitationId");
    expect(impact.message.cta?.params?.invitationId).toBe(invitationId);
  });

  it("includes a secondary CTA linking to /honors awards tab", () => {
    const horse = mkHorse("h1", "race-eu", 1, 200);
    const result = awardInvitationsPhase.execute(
      mkContext(EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS, [horse], [euroRace]),
    );
    const impact = result.impacts[0] as {
      message: { secondaryCta?: { label: string; route: string } };
    };
    expect(impact.message.secondaryCta?.label).toBe("Browse Award Categories");
    expect(impact.message.secondaryCta?.route).toBe("/awards/$category");
  });
});

describe("RSVP deadline reminders and audit log", () => {
  const euroRace = mkRace("race-eu2", "Ascot", 200);

  function withInvitation(day: number, inv: AwardCeremonyInvitation): PipelineContext {
    const ctx = mkContext(day, [], [euroRace]);
    return {
      ...ctx,
      state: { ...ctx.state, awardCeremonyInvitations: [inv] },
    } as PipelineContext;
  }

  const base: AwardCeremonyInvitation = {
    id: "inv-1",
    region: "europe",
    year: 1,
    ceremonyName: "Cartier Racing Awards",
    ceremonyDay: EUROPE_CEREMONY_DOY,
    issuedDay: EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS,
    qualifiers: [],
    rsvp: "pending",
    remindersSent: [],
    auditLog: [],
  };

  const deadline = EUROPE_CEREMONY_DOY - RSVP_DEADLINE_LEAD_DAYS;

  it("sends a reminder at each reminder mark and records it once", () => {
    for (const mark of RSVP_REMINDER_MARKS) {
      const result = awardInvitationsPhase.execute(withInvitation(deadline - mark, base));
      const inv = (result.state.awardCeremonyInvitations ?? [])[0];
      expect(result.impacts).toHaveLength(1);
      expect(inv.remindersSent).toContain(mark);
      expect(inv.auditLog?.some((e) => e.kind === "reminder_sent")).toBe(true);

      // Re-running the same day does not duplicate the reminder
      const again = awardInvitationsPhase.execute(withInvitation(deadline - mark, inv));
      expect(again.impacts).toHaveLength(0);
    }
  });

  it("does not remind once the player has responded", () => {
    const responded = { ...base, rsvp: "attending" as const, respondedDay: 300 };
    const result = awardInvitationsPhase.execute(withInvitation(deadline - 5, responded));
    expect(result.impacts).toHaveLength(0);
  });

  it("records a lapsed deadline when no response was submitted", () => {
    const result = awardInvitationsPhase.execute(withInvitation(deadline + 1, base));
    const inv = (result.state.awardCeremonyInvitations ?? [])[0];
    expect(result.impacts).toHaveLength(1);
    expect(inv.auditLog?.some((e) => e.kind === "deadline_lapsed")).toBe(true);
  });

  it("stamps an audit entry on newly issued invitations", () => {
    const horse = mkHorse("h-audit", "race-eu2", 1, 200);
    const result = awardInvitationsPhase.execute(
      mkContext(EUROPE_CEREMONY_DOY - CEREMONY_INVITE_LEAD_DAYS, [horse], [euroRace]),
    );
    const inv = (result.state.awardCeremonyInvitations ?? [])[0];
    expect(inv.auditLog?.[0].kind).toBe("invited");
  });
});
