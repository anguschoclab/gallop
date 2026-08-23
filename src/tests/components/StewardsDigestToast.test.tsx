import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { useGame } from "@/game/store";
import { StewardsDigestToast } from "@/components/stewards/StewardsDigestToast";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";

function makeInquiry(overrides: Partial<StewardsInquiry> = {}): StewardsInquiry {
  return {
    id: "inq-toast-1",
    raceId: "race-toast-1",
    day: 5,
    type: "interference",
    status: "resolved",
    outcome: "warning",
    accusedHorseId: "horse-A",
    description: "Interference in the stretch",
    resolvedDay: 5,
    ...overrides,
  };
}

describe("StewardsDigestToast", () => {
  beforeEach(() => {
    useGame.setState({
      stewardsInquiries: [],
      inbox: [],
      day: 5,
    });
  });

  it("renders nothing when there are no stewards inquiries", () => {
    const { container } = render(createElement(StewardsDigestToast));
    expect(container.textContent).not.toContain("Stewards");
  });

  it("renders a toast when there are stewards inquiries", () => {
    useGame.setState({
      stewardsInquiries: [makeInquiry()],
    });
    render(createElement(StewardsDigestToast));
    expect(screen.getByText(/Stewards/i)).toBeDefined();
  });

  it("does not block the UI (renders inline, not as a modal dialog)", () => {
    useGame.setState({
      stewardsInquiries: [makeInquiry()],
    });
    const { container } = render(createElement(StewardsDigestToast));
    const dialog = container.querySelector("[role='dialog']");
    expect(dialog).toBeNull();
  });

  it("can be dismissed by clicking a close button", () => {
    useGame.setState({
      stewardsInquiries: [makeInquiry()],
    });
    render(createElement(StewardsDigestToast));
    const closeBtn = screen.getByLabelText(/dismiss|close/i);
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Stewards/i)).toBeNull();
  });
});
