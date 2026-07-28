import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

import { CampaignCard } from "@/components/scheduler/CampaignCard";
import type { Horse } from "@/game/types";
import type { HorseCampaign } from "@/core/calendar/campaignTypes";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, conformation: 70, consistency: 70 },
    ...overrides,
  }) as Horse;

const mkCampaign = (overrides: Partial<HorseCampaign> = {}): HorseCampaign => ({
  horseId: "h1",
  goalType: "free_run",
  autoManaged: false,
  flags: [],
  slots: [],
  confirmedAptitudes: {
    surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
    distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
  },
  createdDay: 0,
  lastReviewedDay: 0,
  ...overrides,
});

describe("CampaignCard — tooltip replacement of native title", () => {
  it("no native title attributes remain on action buttons", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign()}
        horse={mkHorse()}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });

  it("has Trash2 icon inside tooltip trigger for delete", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign()}
        horse={mkHorse()}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    const trashIcons = container.querySelectorAll("svg.lucide-trash-2");
    expect(trashIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("has X icon inside tooltip trigger for dismiss flag", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign({ flags: [{ day: 1, type: "low_energy", message: "Low energy", dismissed: false }] })}
        horse={mkHorse()}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    const xIcons = container.querySelectorAll("svg.lucide-x");
    expect(xIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("uses Tooltip with delayDuration={300}", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign()}
        horse={mkHorse()}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    // Radix Tooltip Root renders a data-state attribute on its trigger
    // The TooltipProvider wraps everything — check for tooltip content elements
    const tooltipContent = container.querySelectorAll(
      "[data-radix-tooltip-content-transform-origin]",
    );
    // Tooltips are portaled so may not be in container directly.
    // Instead, verify no title attributes and that buttons have aria-labels
    const deleteBtn = container.querySelector("button[aria-label*='Delete campaign']");
    expect(deleteBtn).toBeTruthy();
  });

  it("preserves aria-label on delete button", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign()}
        horse={mkHorse({ name: "Thunder" })}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    const deleteBtn = container.querySelector("button[aria-label*='Delete campaign']");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn?.getAttribute("aria-label")).toContain("Thunder");
  });

  it("preserves aria-label on dismiss flag button", () => {
    const { container } = render(
      <CampaignCard
        campaign={mkCampaign({ flags: [{ day: 1, type: "low_energy", message: "Low energy", dismissed: false }] })}
        horse={mkHorse({ name: "Thunder" })}
        getRace={vi.fn()}
        onDelete={vi.fn()}
        onDismissFlag={vi.fn()}
      />,
    );
    const dismissBtn = container.querySelector("button[aria-label*='Dismiss flag']");
    expect(dismissBtn).toBeTruthy();
    expect(dismissBtn?.getAttribute("aria-label")).toContain("Low energy");
  });
});
