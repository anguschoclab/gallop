import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RaceFeed } from "@/components/race/RaceFeed";
import type { Horse, Race } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

vi.mock("@/components/race/WeatherForecastStrip", () => ({
  WeatherForecastStrip: () => null,
}));

describe("RaceFeed claiming race access", () => {
  it("surfaces claim filing for a claiming race even when the player has no entry", () => {
    const horse = {
      id: "horse-1",
      name: "Claim Target",
      ownership: makeNpcOwned(asNpcStableId("seller")),
    } as Horse;
    const race = {
      id: "race-1",
      name: "Open Claiming Race",
      day: 10,
      distance: 1600,
      raceClass: "Claiming",
      entryFee: 0,
      purse: 10000,
      fieldSize: 8,
      entries: [{ horseId: horse.id, ownership: horse.ownership }],
      resolved: false,
      claimingPrice: 25000,
    } as Race;

    render(
      <RaceFeed
        races={[race]}
        viewMode="list"
        onViewModeChange={vi.fn()}
        onEnterRace={vi.fn()}
        horses={[horse]}
        claims={[]}
        pendingIntents={[]}
        cash={100000}
        fileClaim={vi.fn()}
      />,
    );

    expect(screen.getByText(/claiming race entries/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^claim /i })).toBeTruthy();
  });
});
