import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeremonyTimeline } from "@/components/awards/CeremonyTimeline";
import type { AwardCeremonyInvitation, InvitationAuditEntry } from "@/core/awards/invitations";

function mkEntry(overrides: Partial<InvitationAuditEntry> = {}): InvitationAuditEntry {
  return { day: 290, kind: "rsvp_change", note: "Test note", ...overrides };
}

function mkInvitation(auditLog?: InvitationAuditEntry[]): AwardCeremonyInvitation {
  return {
    id: "inv-1",
    region: "europe",
    year: 1,
    ceremonyName: "Cartier Racing Awards",
    ceremonyDay: 300,
    issuedDay: 286,
    qualifiers: [],
    rsvp: "pending",
    auditLog,
  };
}

describe("CeremonyTimeline", () => {
  it("renders 'No activity yet' when auditLog is empty", () => {
    render(<CeremonyTimeline invitation={mkInvitation([])} />);
    expect(screen.getByText("No activity yet")).toBeTruthy();
  });

  it("renders 'No activity yet' when auditLog is undefined", () => {
    render(<CeremonyTimeline invitation={mkInvitation(undefined)} />);
    expect(screen.getByText("No activity yet")).toBeTruthy();
  });

  it("renders entries sorted by day ascending", () => {
    const entries = [
      mkEntry({ day: 295, kind: "rsvp_change", note: "Later" }),
      mkEntry({ day: 286, kind: "invited", note: "First" }),
      mkEntry({ day: 290, kind: "reminder_sent", note: "Middle" }),
    ];
    const { container } = render(<CeremonyTimeline invitation={mkInvitation(entries)} />);
    const items = container.querySelectorAll("[data-testid='timeline-entry']");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("Day 286");
    expect(items[1].textContent).toContain("Day 290");
    expect(items[2].textContent).toContain("Day 295");
  });

  it("shows day number, label, and note for each entry", () => {
    const entries = [
      mkEntry({ day: 286, kind: "invited", note: "Invitation issued with 2 qualifying placings." }),
    ];
    const { container } = render(<CeremonyTimeline invitation={mkInvitation(entries)} />);
    const entry = container.querySelector("[data-testid='timeline-entry']");
    expect(entry?.textContent).toContain("Day 286");
    expect(entry?.textContent).toContain("Invitation issued");
    expect(entry?.textContent).toContain("Invitation issued with 2 qualifying placings.");
  });

  it("highlights reminder_sent entries with accent class", () => {
    const entries = [mkEntry({ day: 290, kind: "reminder_sent", note: "Reminder sent." })];
    const { container } = render(<CeremonyTimeline invitation={mkInvitation(entries)} />);
    const dot = container.querySelector("[data-testid='timeline-dot']");
    expect(dot?.className).toContain("bg-gold");
  });

  it("highlights rsvp_change entries with accent class", () => {
    const entries = [mkEntry({ day: 292, kind: "rsvp_change", note: "RSVP changed." })];
    const { container } = render(<CeremonyTimeline invitation={mkInvitation(entries)} />);
    const dot = container.querySelector("[data-testid='timeline-dot']");
    expect(dot?.className).toContain("bg-gold");
  });

  it("renders all five audit kinds", () => {
    const entries = [
      mkEntry({ day: 286, kind: "invited", note: "Invited" }),
      mkEntry({ day: 290, kind: "reminder_sent", note: "Reminded" }),
      mkEntry({ day: 292, kind: "rsvp_change", note: "Changed" }),
      mkEntry({ day: 298, kind: "deadline_lapsed", note: "Lapsed" }),
      mkEntry({ day: 300, kind: "ceremony_held", note: "Held" }),
    ];
    const { container } = render(<CeremonyTimeline invitation={mkInvitation(entries)} />);
    const items = container.querySelectorAll("[data-testid='timeline-entry']");
    expect(items).toHaveLength(5);
    expect(container.textContent).toContain("Invitation issued");
    expect(container.textContent).toContain("Reminder sent");
    expect(container.textContent).toContain("RSVP updated");
    expect(container.textContent).toContain("Deadline lapsed");
    expect(container.textContent).toContain("Ceremony held");
  });
});
