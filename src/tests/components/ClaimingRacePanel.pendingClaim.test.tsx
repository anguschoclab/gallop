import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { ClaimingRacePanel } from "@/domains/race/ui/ClaimingRacePanel";
import type { Horse, Race } from "@/platform/game/types";
import type { ClaimingIntent } from "@/platform/resolver/intents";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

const horse = {
  id: "horse-1",
  name: "Target Horse",
  age: 4,
  gender: "colt",
} as Horse;

const race = {
  id: "race-1",
  name: "Pending Claim Race",
  day: 10,
  distance: 1600,
  raceClass: "Claiming",
  entryFee: 0,
  purse: 10000,
  fieldSize: 8,
  entries: [{ horseId: horse.id, ownership: makeNpcOwned(asNpcStableId("seller")) }],
  resolved: false,
  claimingPrice: 25000,
} as Race;

const pendingIntent: ClaimingIntent = {
  id: "pending-claim-1",
  entityId: "player",
  source: "player",
  day: 10,
  priority: 60,
  type: "claiming",
  raceId: race.id,
  horseId: horse.id,
  claimingPrice: 25000,
};

describe("ClaimingRacePanel pending player claim", () => {
  it("shows filed feedback for a pending claiming intent before claim registration runs", () => {
    render(
      <ClaimingRacePanel
        race={race}
        horses={[horse]}
        claims={[]}
        pendingIntents={[pendingIntent]}
        cash={100000}
        fileClaim={vi.fn()}
      />,
    );

    expect(screen.getByText("Claim filed.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Claim/i })).toBeNull();
  });
});
