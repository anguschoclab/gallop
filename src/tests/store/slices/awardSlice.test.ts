import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import type { AwardCeremonyInvitation } from "@/core/awards/invitations";

function mkInvitation(
  id: string,
  overrides: Partial<AwardCeremonyInvitation> = {},
): AwardCeremonyInvitation {
  return {
    id,
    region: "europe",
    year: 1,
    ceremonyName: `Ceremony ${id}`,
    ceremonyDay: 300,
    issuedDay: 286,
    qualifiers: [],
    rsvp: "pending",
    remindersSent: [],
    auditLog: [{ day: 286, kind: "invited", to: "pending", note: "Invitation issued." }],
    ...overrides,
  };
}

describe("bulkSetCeremonyRsvp", () => {
  beforeEach(() => {
    seedStore({ ...createDefaultGameState() });
  });

  it("updates all matching invitations to the target status", () => {
    const inv1 = mkInvitation("inv-1");
    const inv2 = mkInvitation("inv-2");
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [inv1, inv2],
    });

    useGame.getState().bulkSetCeremonyRsvp(["inv-1", "inv-2"], "attending");

    const updated = useGame.getState().awardCeremonyInvitations ?? [];
    expect(updated[0].rsvp).toBe("attending");
    expect(updated[1].rsvp).toBe("attending");
  });

  it("appends an rsvp_change audit entry with correct from/to/day/note", () => {
    const inv = mkInvitation("inv-1");
    seedStore({
      ...createDefaultGameState(),
      day: 295,
      awardCeremonyInvitations: [inv],
    });

    useGame.getState().bulkSetCeremonyRsvp(["inv-1"], "attending");

    const updated = (useGame.getState().awardCeremonyInvitations ?? [])[0];
    const entry = updated.auditLog?.[updated.auditLog.length - 1];
    expect(entry?.kind).toBe("rsvp_change");
    expect(entry?.from).toBe("pending");
    expect(entry?.to).toBe("attending");
    expect(entry?.day).toBe(295);
    expect(entry?.note).toContain("Awaiting RSVP");
    expect(entry?.note).toContain("Attending");
  });

  it("stamps respondedDay with the current game day", () => {
    const inv = mkInvitation("inv-1");
    seedStore({
      ...createDefaultGameState(),
      day: 292,
      awardCeremonyInvitations: [inv],
    });

    useGame.getState().bulkSetCeremonyRsvp(["inv-1"], "declined");

    const updated = (useGame.getState().awardCeremonyInvitations ?? [])[0];
    expect(updated.respondedDay).toBe(292);
  });

  it("skips invitations already at the target status (no audit entry, no respondedDay change)", () => {
    const inv = mkInvitation("inv-1", {
      rsvp: "attending",
      respondedDay: 280,
    });
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [inv],
    });

    const beforeAuditLen = inv.auditLog?.length ?? 0;
    useGame.getState().bulkSetCeremonyRsvp(["inv-1"], "attending");

    const updated = (useGame.getState().awardCeremonyInvitations ?? [])[0];
    expect(updated.rsvp).toBe("attending");
    expect(updated.respondedDay).toBe(280);
    expect(updated.auditLog?.length).toBe(beforeAuditLen);
  });

  it("leaves invitations not in the ids array untouched", () => {
    const inv1 = mkInvitation("inv-1");
    const inv2 = mkInvitation("inv-2");
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [inv1, inv2],
    });

    useGame.getState().bulkSetCeremonyRsvp(["inv-1"], "attending");

    const updated = useGame.getState().awardCeremonyInvitations ?? [];
    expect(updated[0].rsvp).toBe("attending");
    expect(updated[1].rsvp).toBe("pending");
    expect(updated[1].respondedDay).toBeUndefined();
  });

  it("is a no-op when invitationIds is empty", () => {
    const inv = mkInvitation("inv-1");
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [inv],
    });

    useGame.getState().bulkSetCeremonyRsvp([], "attending");

    const updated = (useGame.getState().awardCeremonyInvitations ?? [])[0];
    expect(updated.rsvp).toBe("pending");
    expect(updated.auditLog?.length).toBe(1);
  });

  it("does not crash when awardCeremonyInvitations is undefined", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: undefined,
    });

    expect(() => useGame.getState().bulkSetCeremonyRsvp(["inv-1"], "attending")).not.toThrow();
  });
});
