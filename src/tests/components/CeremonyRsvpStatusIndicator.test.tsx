import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeremonyRsvpStatusIndicator } from "@/components/awards/CeremonyRsvpStatusIndicator";
import type { AwardCeremonyInvitation } from "@/core/awards/invitations";

function mkInvitation(overrides: Partial<AwardCeremonyInvitation> = {}): AwardCeremonyInvitation {
  return {
    id: "inv-1",
    region: "europe",
    year: 1,
    ceremonyName: "Cartier Racing Awards",
    ceremonyDay: 300,
    issuedDay: 286,
    qualifiers: [],
    rsvp: "pending",
    ...overrides,
  };
}

describe("CeremonyRsvpStatusIndicator", () => {
  it("shows 'Awaiting RSVP' when rsvp is pending and deadline not passed", () => {
    render(<CeremonyRsvpStatusIndicator invitation={mkInvitation()} day={290} />);
    expect(screen.getByText("Awaiting RSVP")).toBeTruthy();
  });

  it("shows 'Awaiting RSVP' when rsvp is attending, deadline not passed, ceremony not held", () => {
    render(
      <CeremonyRsvpStatusIndicator
        invitation={mkInvitation({ rsvp: "attending", respondedDay: 290 })}
        day={290}
      />,
    );
    expect(screen.getByText("Awaiting RSVP")).toBeTruthy();
  });

  it("shows 'RSVP Locked' when deadline passed and ceremony not held", () => {
    render(
      <CeremonyRsvpStatusIndicator invitation={mkInvitation({ rsvp: "pending" })} day={299} />,
    );
    expect(screen.getByText("RSVP Locked")).toBeTruthy();
  });

  it("shows 'RSVP Locked' even when already responded, if deadline passed and ceremony not held", () => {
    render(
      <CeremonyRsvpStatusIndicator
        invitation={mkInvitation({ rsvp: "attending", respondedDay: 290 })}
        day={299}
      />,
    );
    expect(screen.getByText("RSVP Locked")).toBeTruthy();
  });

  it("shows 'Counted' when ceremony held and rsvp is attending", () => {
    render(
      <CeremonyRsvpStatusIndicator
        invitation={mkInvitation({ rsvp: "attending", respondedDay: 290 })}
        day={301}
      />,
    );
    expect(screen.getByText("Counted")).toBeTruthy();
  });

  it("shows 'Not Counted' when ceremony held and rsvp is not attending", () => {
    render(
      <CeremonyRsvpStatusIndicator
        invitation={mkInvitation({ rsvp: "declined", respondedDay: 290 })}
        day={301}
      />,
    );
    expect(screen.getByText("Not Counted")).toBeTruthy();
  });

  it("shows 'Not Counted' when ceremony held and rsvp is pending (lapsed)", () => {
    render(
      <CeremonyRsvpStatusIndicator invitation={mkInvitation({ rsvp: "pending" })} day={301} />,
    );
    expect(screen.getByText("Not Counted")).toBeTruthy();
  });

  it("renders tooltip content explaining the current phase", () => {
    const { container } = render(
      <CeremonyRsvpStatusIndicator invitation={mkInvitation()} day={290} />,
    );
    expect(container.textContent).toContain("Awaiting RSVP");
  });
});
