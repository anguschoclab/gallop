import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { useStewardsLog } from "@/hooks/stewards/useStewardsLog";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import { createStewardsInquiry, resolveInquiry } from "@/core/stewards/stewardTypes";

function seedInquiries(inquiries: StewardsInquiry[]) {
  useGame.setState({ ...createDefaultGameState(), stewardsInquiries: inquiries });
}

describe("useStewardsLog", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("returns empty array when no inquiries exist", () => {
    const { result } = renderHook(() => useStewardsLog());
    expect(result.current.inquiries).toEqual([]);
  });

  it("returns all inquiries sorted by day descending (newest first)", () => {
    const i1 = createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident 1");
    const i2 = createStewardsInquiry("race-2", 50, "lane_violation", "h-2", "Incident 2");
    const i3 = createStewardsInquiry("race-3", 30, "improper_riding", "h-3", "Incident 3");
    seedInquiries([i1, i2, i3]);

    const { result } = renderHook(() => useStewardsLog());
    expect(result.current.inquiries.map((i) => i.day)).toEqual([50, 30, 10]);
  });

  it("filters by outcome", () => {
    const i1 = resolveInquiry(
      createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident 1"),
      "no_action",
    );
    const i2 = resolveInquiry(
      createStewardsInquiry("race-2", 20, "interference", "h-2", "Incident 2"),
      "disqualification",
    );
    seedInquiries([i1, i2]);

    const { result } = renderHook(() => useStewardsLog({ outcome: "disqualification" }));
    expect(result.current.inquiries).toHaveLength(1);
    expect(result.current.inquiries[0].outcome).toBe("disqualification");
  });

  it("filters by inquiry type", () => {
    const i1 = createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident 1");
    const i2 = createStewardsInquiry("race-2", 20, "lane_violation", "h-2", "Incident 2");
    seedInquiries([i1, i2]);

    const { result } = renderHook(() => useStewardsLog({ type: "lane_violation" }));
    expect(result.current.inquiries).toHaveLength(1);
    expect(result.current.inquiries[0].type).toBe("lane_violation");
  });

  it("filters by horse ID (accused or reporting)", () => {
    const i1 = createStewardsInquiry("race-1", 10, "interference", "h-target", "Incident 1", {
      reportingHorseId: "h-other",
    });
    const i2 = createStewardsInquiry("race-2", 20, "interference", "h-different", "Incident 2");
    seedInquiries([i1, i2]);

    const { result } = renderHook(() => useStewardsLog({ horseId: "h-target" }));
    expect(result.current.inquiries).toHaveLength(1);
    expect(result.current.inquiries[0].accusedHorseId).toBe("h-target");

    const { result: result2 } = renderHook(() => useStewardsLog({ horseId: "h-other" }));
    expect(result2.current.inquiries).toHaveLength(1);
    expect(result2.current.inquiries[0].reportingHorseId).toBe("h-other");
  });

  it("computes summary stats (total, by outcome, by status)", () => {
    const i1 = resolveInquiry(
      createStewardsInquiry("race-1", 10, "interference", "h-1", "Incident 1"),
      "no_action",
    );
    const i2 = resolveInquiry(
      createStewardsInquiry("race-2", 20, "interference", "h-2", "Incident 2"),
      "disqualification",
    );
    const i3 = createStewardsInquiry("race-3", 30, "interference", "h-3", "Incident 3");
    seedInquiries([i1, i2, i3]);

    const { result } = renderHook(() => useStewardsLog());
    expect(result.current.summary.total).toBe(3);
    expect(result.current.summary.resolved).toBe(2);
    expect(result.current.summary.pending).toBe(1);
    expect(result.current.summary.disqualifications).toBe(1);
  });
});
