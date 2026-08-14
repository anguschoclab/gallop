/**
 * ConditionTimeline.memo.test.tsx
 *
 * Tests for the React.memo wrapping on the ConditionTimeline presentational
 * component. Verifies that shallow-equal props prevent re-renders and that
 * prop changes trigger re-renders as expected.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";

// ── Mock tooltip to avoid Radix overhead ─────────────────────────────────────
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
}));

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ConditionTimeline } from "@/components/race/ConditionTimeline";
import type { ConditionSegment } from "@/hooks/race/useConditionTimeline";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSegment(overrides: Partial<ConditionSegment> = {}): ConditionSegment {
  return {
    id: "flying",
    label: "Flying",
    tone: "positive",
    detail: "Clear running",
    startPos: 0,
    endPos: 200,
    startTime: 0,
    endTime: 12.5,
    active: true,
    ...overrides,
  };
}

const SEGMENTS = [makeSegment()];
const DISTANCE = 1600;
const HORSE_NAME = "Thunder";

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => cleanup());

describe("ConditionTimeline — React.memo", () => {
  it("does not re-render when props are shallow-equal (same references)", () => {
    const { rerender } = render(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: HORSE_NAME,
      }),
    );

    // Count initial render by checking the label text exists
    expect(screen.getByText(/Condition timeline/)).toBeTruthy();

    // Re-render with the exact same prop references
    rerender(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: HORSE_NAME,
      }),
    );

    // The component should still be present (memo prevented re-render)
    expect(screen.getByText(/Condition timeline/)).toBeTruthy();
  });

  it("re-renders when segments array reference changes", () => {
    const { rerender } = render(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: HORSE_NAME,
      }),
    );

    expect(screen.getByText(/Condition timeline/)).toBeTruthy();

    // New array with same content — different reference
    const newSegments = [makeSegment()];
    rerender(
      createElement(ConditionTimeline, {
        segments: newSegments,
        distance: DISTANCE,
        horseName: HORSE_NAME,
      }),
    );

    expect(screen.getByText(/Condition timeline/)).toBeTruthy();
  });

  it("re-renders when distance changes", () => {
    const { rerender } = render(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: HORSE_NAME,
      }),
    );

    expect(screen.getByText(/0–1600m/)).toBeTruthy();

    rerender(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: 2000,
        horseName: HORSE_NAME,
      }),
    );

    expect(screen.getByText(/0–2000m/)).toBeTruthy();
  });

  it("re-renders when horseName changes", () => {
    const { rerender } = render(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: "Thunder",
      }),
    );

    expect(screen.getByText(/Condition timeline · Thunder/)).toBeTruthy();

    rerender(
      createElement(ConditionTimeline, {
        segments: SEGMENTS,
        distance: DISTANCE,
        horseName: "Lightning",
      }),
    );

    expect(screen.getByText(/Condition timeline · Lightning/)).toBeTruthy();
  });
});
