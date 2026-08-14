import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { render } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { InvitationHistoryPanel } from "@/components/awards/InvitationHistoryPanel";
import type { AwardCeremonyInvitation } from "@/core/awards/invitations";
import type { RegionalAward } from "@/core/awards/types";

const mkInvitation = (overrides: Partial<AwardCeremonyInvitation> = {}): AwardCeremonyInvitation =>
  ({
    id: "inv1",
    ceremonyName: "Eclipse Awards",
    region: "north_america",
    year: 1,
    ceremonyDay: 365,
    rsvp: "attending",
    qualifiers: [],
    auditLog: [],
    ...overrides,
  }) as AwardCeremonyInvitation;

describe("InvitationHistoryPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no past invitations", () => {
    render(<InvitationHistoryPanel invitations={[]} awards={[]} day={100} />);
    expect(screen.getByText(/No past invitations yet/i)).toBeTruthy();
  });

  it("renders filter controls and invitation rows when past invitations exist", () => {
    const inv = mkInvitation({ ceremonyDay: 50 });
    render(<InvitationHistoryPanel invitations={[inv]} awards={[]} day={100} />);
    expect(screen.getByText("Invitation History")).toBeTruthy();
    expect(screen.getByText("Eclipse Awards")).toBeTruthy();
  });

  it("shows filter dropdowns", () => {
    const inv = mkInvitation({ ceremonyDay: 50 });
    render(<InvitationHistoryPanel invitations={[inv]} awards={[]} day={100} />);
    expect(screen.getByLabelText("Filter by region")).toBeTruthy();
    expect(screen.getByLabelText("Filter by attendance")).toBeTruthy();
    expect(screen.getByLabelText("Filter by outcome")).toBeTruthy();
  });
});
