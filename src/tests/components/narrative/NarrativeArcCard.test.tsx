import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NarrativeArcCard } from "@/components/narrative/NarrativeArcCard";
import type { NarrativeArc, StoryBeat } from "@/core/ai/npcCycleAI";

function createMockArc(overrides: Partial<NarrativeArc> = {}): NarrativeArc {
  return {
    id: "arc-1",
    type: "rivalry",
    stableId: "s1",
    startDay: 100,
    status: "rising_action",
    beats: [],
    ...overrides,
  };
}

function createMockBeat(overrides: Partial<StoryBeat> = {}): StoryBeat {
  return {
    day: 110,
    arcId: "arc-1",
    headline: "Tensions rise between stables",
    body: "A dramatic confrontation unfolded at the auction.",
    ...overrides,
  };
}

describe("NarrativeArcCard", () => {
  it("renders arc type", () => {
    const arc = createMockArc({ type: "rivalry" });
    render(<NarrativeArcCard arc={arc} stableName="Alpha Stable" />);
    expect(screen.getByText(/rivalry/i)).toBeInTheDocument();
  });

  it("renders stable name", () => {
    const arc = createMockArc();
    render(<NarrativeArcCard arc={arc} stableName="Alpha Stable" />);
    expect(screen.getByText("Alpha Stable")).toBeInTheDocument();
  });

  it("renders arc status badge", () => {
    const arc = createMockArc({ status: "climax" });
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.getByText(/climax/i)).toBeInTheDocument();
  });

  it("renders progress indicator based on status", () => {
    const arc = createMockArc({ status: "rising_action" });
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.getByTestId("arc-progress")).toBeInTheDocument();
  });

  it("renders latest story beat when present", () => {
    const beat = createMockBeat({
      headline: "Epic showdown at the track",
      body: "The two rivals faced off in a thrilling race.",
    });
    const arc = createMockArc({ beats: [beat] });
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.getByText("Epic showdown at the track")).toBeInTheDocument();
  });

  it("renders in-progress text when no beats", () => {
    const arc = createMockArc({ beats: [] });
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.getByText(/story in progress/i)).toBeInTheDocument();
  });

  it("renders rivalry watch badge when isRivalry flag set", () => {
    const arc = createMockArc();
    render(<NarrativeArcCard arc={arc} stableName="Alpha" isRivalry />);
    expect(screen.getByText(/rivalry watch/i)).toBeInTheDocument();
  });

  it("does not render rivalry watch badge when flag not set", () => {
    const arc = createMockArc();
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.queryByText(/rivalry watch/i)).not.toBeInTheDocument();
  });

  it("renders completed arc with resolution styling", () => {
    const arc = createMockArc({
      status: "resolution",
      beats: [createMockBeat({ headline: "Final chapter", body: "The saga ends." })],
    });
    render(<NarrativeArcCard arc={arc} stableName="Alpha" />);
    expect(screen.getByText("Final chapter")).toBeInTheDocument();
  });
});
