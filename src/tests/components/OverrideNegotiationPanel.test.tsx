import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OverrideNegotiationPanel } from "@/components/auction/OverrideNegotiationPanel";
import type { HorseAttachment, AttachmentTier } from "@/core/horse/attachment";
import type { Horse, Stable } from "@/game/types";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function mkAttachment(tier: AttachmentTier): HorseAttachment {
  const scores: Record<AttachmentTier, number> = {
    available: 10,
    valued: 35,
    protected: 60,
    untouchable: 85,
  };
  return {
    score: scores[tier],
    tier,
    label: tier.charAt(0).toUpperCase() + tier.slice(1),
    askMultiplier: tier === "untouchable" ? 5.0 : tier === "protected" ? 2.5 : 1.2,
    signals: [
      { label: "Fame", points: 18 },
      { label: "Potential", points: 22 },
    ],
    blurb: "",
  };
}

const mkHorse = (): Horse =>
  createTestNpcHorse({
    id: "h1",
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("s1")),
  });

const mkStable = (): Stable =>
  ({
    id: "s1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["h1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
  }) as Stable;

describe("OverrideNegotiationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders for protected horse", () => {
    const onOverride = vi.fn();
    const { container } = render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("protected")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );
    expect(container.textContent).toContain("Premium");
    expect(container.textContent).toContain("Diplomatic");
  });

  it("renders for untouchable horse", () => {
    const onOverride = vi.fn();
    const { container } = render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("untouchable")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );
    expect(container.textContent).toContain("Premium");
  });

  it("does not render for available horse", () => {
    const onOverride = vi.fn();
    const { container } = render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("available")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );
    expect(container.textContent).toBe("");
  });

  it("premium buyout shows cost and guaranteed label", () => {
    const onOverride = vi.fn();
    const { container } = render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("protected")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );
    expect(container.textContent).toContain("75,000");
  });

  it("diplomatic pressure shows odds percentage", () => {
    const onOverride = vi.fn();
    const { container } = render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("protected")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );
    expect(container.textContent).toMatch(/\d+%/);
  });

  it("premium button calls onOverride with premium type", () => {
    const onOverride = vi.fn();
    render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("protected")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );

    const premiumButton = screen.getAllByRole("button").find((b) => /Premium/i.test(b.textContent || ""));
    expect(premiumButton).toBeTruthy();
    fireEvent.click(premiumButton!);

    const confirmButton = screen.getByRole("button", { name: /confirm buyout/i });
    fireEvent.click(confirmButton);

    expect(onOverride).toHaveBeenCalledWith("premium");
  });

  it("diplomatic button opens confirmation dialog", () => {
    const onOverride = vi.fn();
    render(
      <OverrideNegotiationPanel
        horse={mkHorse()}
        stable={mkStable()}
        attachment={mkAttachment("protected")}
        ask={50000}
        valuation={40000}
        cash={200000}
        onOverride={onOverride}
      />,
    );

    const diploButton = screen.getAllByRole("button").find((b) => /Diplomatic/i.test(b.textContent || ""));
    expect(diploButton).toBeTruthy();
    fireEvent.click(diploButton!);

    expect(screen.getAllByText(/odds|chance|penalty|relationship/i).length).toBeGreaterThan(0);
  });
});
