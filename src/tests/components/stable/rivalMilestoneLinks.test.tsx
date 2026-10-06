import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () =>
  (await import("@/test-utils/routerMock")).createRouterMock(),
);
vi.mock("@/game/store", () => {
  const state = {
    races: { r1: { id: "r1", trackId: "t1", name: "Debut Stakes" } },
    trackLedger: [],
  };
  return { useGame: (sel: (s: typeof state) => unknown) => sel(state) };
});

import { RivalCareerMilestoneTimeline } from "@/components/stable/RivalCareerMilestoneTimeline";

describe("RivalCareerMilestoneTimeline links", () => {
  it("links milestones to race result, course and horse record", () => {
    render(
      <RivalCareerMilestoneTimeline
        horseId="h1"
        milestones={[
          {
            key: "debut",
            kind: "debut",
            title: "Debut",
            day: 10,
            announced: true,
            raceId: "r1",
            raceName: "Debut Stakes",
          },
          { key: "retirement", kind: "retirement", title: "Retired", day: 900, announced: true },
        ]}
      />,
    );
    const race = screen.getByText("Race result").closest("a")!;
    expect(race.getAttribute("to")).toBe("/race/$raceId");
    expect(screen.getByText("Course").closest("a")!.getAttribute("to")).toBe("/track-history");
    expect(screen.getByText("Retirement record").closest("a")!.getAttribute("to")).toBe(
      "/stable/$horseId",
    );
    expect(screen.getAllByText("Career record")).toHaveLength(1);
  });
});
