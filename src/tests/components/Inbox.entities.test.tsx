import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { createTestHorse } from "@/tests/helpers";
import InboxPage from "@/components/routes/InboxPage";
import { makePlayerOwned } from "@/core/horse/ownership";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

// We test the Inbox page body rendering by importing the component directly
// The route component uses useInbox which reads from the game store
describe("Inbox — entity linking", () => {
  it("renders message body with NewsContent auto-detection for horse names", async () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Thunder Strike",
      ownership: makePlayerOwned(),
    });
    seedStore({
      ...createDefaultGameState(),
      day: 55,
      horses: { [horse.id]: horse },
      inbox: [
        {
          id: "msg1",
          day: 50,
          title: "Race Result",
          body: "Thunder Strike won the big race",
          category: "race",
          priority: "info" as const,
          readAt: undefined,
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    const link = container.querySelector("a[to='/stable/$horseId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Thunder Strike");
  });
});

describe("Inbox — ceremony integration", () => {
  it("renders BulkRsvpControls when 2+ pending invitations exist", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
        },
        {
          id: "inv-2",
          region: "north_america",
          year: 1,
          ceremonyName: "Eclipse Awards",
          ceremonyDay: 310,
          issuedDay: 296,
          qualifiers: [],
          rsvp: "pending",
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.querySelector("[data-testid='bulk-rsvp-controls']")).not.toBeNull();
  });

  it("does not render BulkRsvpControls when fewer than 2 pending invitations", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.querySelector("[data-testid='bulk-rsvp-controls']")).toBeNull();
  });

  it("renders InboxCeremonyRsvp for messages with invitationId CTA", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [
        {
          id: "msg1",
          day: 286,
          title: "Ceremony Invitation",
          body: "You have been invited.",
          category: "system",
          priority: "info" as const,
          readAt: undefined,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: "inv-1" },
          },
        },
      ],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.querySelector("[data-testid='rsvp-status']")).not.toBeNull();
  });

  it("enhanced InboxCeremonyRsvp renders CeremonyRsvpStatusIndicator", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [
        {
          id: "msg1",
          day: 286,
          title: "Ceremony Invitation",
          body: "You have been invited.",
          category: "system",
          priority: "info" as const,
          readAt: undefined,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: "inv-1" },
          },
        },
      ],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    const statusBadge = container.querySelector("[data-testid='rsvp-status']");
    expect(statusBadge).not.toBeNull();
    expect(statusBadge?.textContent).toContain("Awaiting RSVP");
  });

  it("enhanced InboxCeremonyRsvp renders CeremonyTimeline", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [
        {
          id: "msg1",
          day: 286,
          title: "Ceremony Invitation",
          body: "You have been invited.",
          category: "system",
          priority: "info" as const,
          readAt: undefined,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: "inv-1" },
          },
        },
      ],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
          auditLog: [{ day: 286, kind: "invited", note: "Invitation issued." }],
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    const timelineEntry = container.querySelector("[data-testid='timeline-entry']");
    expect(timelineEntry).not.toBeNull();
    expect(timelineEntry?.textContent).toContain("Day 286");
  });

  it("enhanced InboxCeremonyRsvp renders timeline 'No activity yet' when auditLog is empty", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [
        {
          id: "msg1",
          day: 286,
          title: "Ceremony Invitation",
          body: "You have been invited.",
          category: "system",
          priority: "info" as const,
          readAt: undefined,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: "inv-1" },
          },
        },
      ],
      awardCeremonyInvitations: [
        {
          id: "inv-1",
          region: "europe",
          year: 1,
          ceremonyName: "Cartier Awards",
          ceremonyDay: 300,
          issuedDay: 286,
          qualifiers: [],
          rsvp: "pending",
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.textContent).toContain("No activity yet");
  });

  it("renders secondary CTA button when message has secondaryCta", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      inbox: [
        {
          id: "msg1",
          day: 286,
          title: "Ceremony Invitation",
          body: "You have been invited.",
          category: "system",
          priority: "info" as const,
          readAt: undefined,
          cta: {
            label: "View Ceremony",
            route: "/ceremony/$invitationId",
            params: { invitationId: "inv-1" },
          },
          secondaryCta: {
            label: "View Awards",
            route: "/honors",
          },
        },
      ],
      awardCeremonyInvitations: [],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.textContent).toContain("View Awards");
  });
});

describe("Inbox — priority tier rendering", () => {
  it("renders critical priority messages with destructive button variant", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      inbox: [
        {
          id: "msg-critical",
          day: 5,
          title: "Career-ending Injury",
          body: "Your horse has sustained a career-ending injury.",
          category: "injury",
          priority: "critical" as any,
          readAt: undefined,
          cta: {
            label: "View Horse",
            route: "stable.$horseId",
            params: { horseId: "h1" },
          },
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    const destructiveButton = container.querySelector("button.bg-destructive");
    expect(destructiveButton).not.toBeNull();
  });

  it("renders low priority messages without errors", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      inbox: [
        {
          id: "msg-low",
          day: 5,
          title: "Moderate Injury",
          body: "Your horse has a moderate injury. Recovery: 21 days.",
          category: "injury",
          priority: "low" as any,
          readAt: undefined,
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    expect(container.textContent).toContain("Moderate Injury");
  });
});
