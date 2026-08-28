import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttachmentBreakdown } from "@/components/auction/AttachmentBreakdown";
import type { HorseAttachment } from "@/core/horse/attachment";

function mkAttachment(overrides: Partial<HorseAttachment> = {}): HorseAttachment {
  return {
    score: 60,
    tier: "protected",
    label: "Protected",
    askMultiplier: 2.5,
    signals: [
      { label: "Public profile / fame", points: 18 },
      { label: "Elite potential", points: 22 },
      { label: "Winning better than 50%", points: 12 },
      { label: "Proven earner", points: 10 },
      { label: "Large fan following", points: 8 },
      { label: "Current campaign horse", points: 8 },
    ],
    blurb: "A cornerstone of the stable — expect an inflated ask.",
    ...overrides,
  };
}

describe("AttachmentBreakdown", () => {
  it("renders all signals (not sliced to 4)", () => {
    const attachment = mkAttachment();
    render(<AttachmentBreakdown attachment={attachment} />);

    expect(screen.getByText("Public profile / fame")).toBeTruthy();
    expect(screen.getByText("Elite potential")).toBeTruthy();
    expect(screen.getByText("Winning better than 50%")).toBeTruthy();
    expect(screen.getByText("Proven earner")).toBeTruthy();
    expect(screen.getByText("Large fan following")).toBeTruthy();
    expect(screen.getByText("Current campaign horse")).toBeTruthy();
  });

  it("renders raw score and tier label", () => {
    const attachment = mkAttachment({ score: 72, label: "Protected" });
    const { container } = render(<AttachmentBreakdown attachment={attachment} />);

    expect(container.textContent).toContain("72");
    expect(container.textContent).toContain("Protected");
  });

  it("formula tooltip trigger is present", () => {
    const attachment = mkAttachment();
    const { container } = render(<AttachmentBreakdown attachment={attachment} />);

    // The info icon button should be rendered as a tooltip trigger
    const tooltipTrigger = container.querySelector("button[type='button']");
    expect(tooltipTrigger).toBeTruthy();
  });
});
