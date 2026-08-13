import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import { BulkRsvpControls } from "@/components/awards/BulkRsvpControls";
import type { AwardCeremonyInvitation } from "@/core/awards/invitations";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

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
    ...overrides,
  };
}

describe("BulkRsvpControls", () => {
  beforeEach(() => {
    seedStore({ ...createDefaultGameState() });
  });

  it("renders nothing when there are 0 pending invitations", () => {
    const { container } = render(<BulkRsvpControls />);
    expect(container.querySelector("[data-testid='bulk-rsvp-controls']")).toBeNull();
  });

  it("renders nothing when there is only 1 pending invitation", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1")],
    });
    const { container } = render(<BulkRsvpControls />);
    expect(container.querySelector("[data-testid='bulk-rsvp-controls']")).toBeNull();
  });

  it("renders checkbox list when 2+ pending invitations exist", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    expect(screen.getByTestId("bulk-rsvp-controls")).toBeTruthy();
    expect(screen.getByText("Ceremony inv-1")).toBeTruthy();
    expect(screen.getByText("Ceremony inv-2")).toBeTruthy();
  });

  it("shows ceremony name, region, and RSVP deadline day for each invitation", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [
        mkInvitation("inv-1", { ceremonyName: "Eclipse Awards", region: "north_america" }),
        mkInvitation("inv-2", { ceremonyName: "Cartier Awards", region: "europe" }),
      ],
    });
    render(<BulkRsvpControls />);
    expect(screen.getByText("Eclipse Awards")).toBeTruthy();
    expect(screen.getByText("Cartier Awards")).toBeTruthy();
  });

  it("Select All selects all pending invitations", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    fireEvent.click(screen.getByText("Select All"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.every((cb) => cb.getAttribute("data-state") === "checked")).toBe(true);
  });

  it("Deselect All clears selection", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    fireEvent.click(screen.getByText("Select All"));
    fireEvent.click(screen.getByText("Deselect All"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.every((cb) => cb.getAttribute("data-state") === "unchecked")).toBe(true);
  });

  it("Attend Selected calls bulkSetCeremonyRsvp with selected IDs and attending", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    fireEvent.click(screen.getByText("Select All"));
    fireEvent.click(screen.getByText("Attend Selected"));
    const invitations = useGame.getState().awardCeremonyInvitations ?? [];
    expect(invitations.every((i) => i.rsvp === "attending")).toBe(true);
  });

  it("Decline Selected calls bulkSetCeremonyRsvp with selected IDs and declined", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    fireEvent.click(screen.getByText("Select All"));
    fireEvent.click(screen.getByText("Decline Selected"));
    const invitations = useGame.getState().awardCeremonyInvitations ?? [];
    expect(invitations.every((i) => i.rsvp === "declined")).toBe(true);
  });

  it("buttons are disabled when no checkboxes are selected", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    expect((screen.getByText("Attend Selected") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("Decline Selected") as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not show invitations where ceremony is already held", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 301,
      awardCeremonyInvitations: [
        mkInvitation("inv-1", { ceremonyDay: 300 }),
        mkInvitation("inv-2", { ceremonyDay: 310 }),
        mkInvitation("inv-3", { ceremonyDay: 315 }),
      ],
    });
    render(<BulkRsvpControls />);
    expect(screen.getByText("Ceremony inv-2")).toBeTruthy();
    expect(screen.getByText("Ceremony inv-3")).toBeTruthy();
    expect(screen.queryByText("Ceremony inv-1")).toBeNull();
  });

  it("does not show invitations where rsvp is not pending", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [
        mkInvitation("inv-1", { rsvp: "attending" }),
        mkInvitation("inv-2", { rsvp: "pending" }),
        mkInvitation("inv-3", { rsvp: "pending" }),
      ],
    });
    render(<BulkRsvpControls />);
    expect(screen.queryByText("Ceremony inv-1")).toBeNull();
    expect(screen.getByText("Ceremony inv-2")).toBeTruthy();
    expect(screen.getByText("Ceremony inv-3")).toBeTruthy();
  });

  it("responded invitations disappear from list after bulk action", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 290,
      awardCeremonyInvitations: [mkInvitation("inv-1"), mkInvitation("inv-2")],
    });
    render(<BulkRsvpControls />);
    fireEvent.click(screen.getByText("Select All"));
    fireEvent.click(screen.getByText("Attend Selected"));
    expect(screen.queryByText("Ceremony inv-1")).toBeNull();
    expect(screen.queryByText("Ceremony inv-2")).toBeNull();
  });
});
