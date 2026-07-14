import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { StepReview } from "@/components/NewGameWizard/steps/StepReview";
import type { Backstory } from "@/core/common/backstories";
import type { PlayerProfile, BackstoryId } from "@/game/types";

const mockBackstory: Backstory = {
  id: "legacy" as BackstoryId,
  label: "Racing Legacy",
  blurb: "Old money, new ambitions.",
  startingCash: 100000,
  horses: [{ tier: "elite", count: 2 }],
  facilityUpgrades: {
    main_track: "standard",
    barn: "standard",
  },
  facilities: {
    main_track: "standard",
    barn: "standard",
  },
  reputationScore: 50,
  reputation: 50,
  difficulty: "easy",
};

const mockProfile: PlayerProfile = {
  stableName: "Test Stables",
  ownerName: "Test Owner",
  silk: { pattern: "solid", primaryColor: "#ff0000" } as any,
} as PlayerProfile;

describe("StepReview — facility upgrade display", () => {
  it("renders Tier 0 in facility upgrades list (not raw level strings)", () => {
    render(
      <StepReview
        stableName="Test Stables"
        ownerName="Test Owner"
        silk={{ pattern: "solid", primaryColor: "#ff0000" } as any}
        backstory={mockBackstory}
      />,
    );

    const dd = screen.getByText(/Tier 0/i);
    expect(dd).toBeTruthy();
  });

  it("does NOT render raw 'standard' as a facility level label", () => {
    const { container } = render(
      <StepReview
        stableName="Test Stables"
        ownerName="Test Owner"
        silk={{ pattern: "solid", primaryColor: "#ff0000" } as any}
        backstory={mockBackstory}
      />,
    );

    const allText = container.textContent ?? "";
    expect(allText).not.toMatch(/\(standard\)/);
    expect(allText).not.toMatch(/\(basic\)/);
    expect(allText).not.toMatch(/\(premium\)/);
    expect(allText).not.toMatch(/\(elite\)/);
  });
});
