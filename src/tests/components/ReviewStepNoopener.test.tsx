/**
 * ReviewStepNoopener.test.tsx — Regression test for rel="noopener noreferrer" on target="_blank" links.
 *
 * Guards against window.opener vulnerabilities by ensuring every link in
 * ReviewStep that uses target="_blank" also includes rel="noopener noreferrer".
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Horse, Jockey, Race } from "@/game/types";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { createTestHorse } from "@/tests/helpers";
import { createTestJockey } from "@/tests/helpers";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, target, rel, ...rest }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={typeof to === "string" ? to : ""}
      data-params={params ? JSON.stringify(params) : ""}
      target={target}
      rel={rel}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/horse/HorsePortrait", () => ({
  HorsePortrait: () => <div data-testid="horse-portrait" />,
}));

vi.mock("@/components/jockey/JockeyAvatar", () => ({
  JockeyAvatar: () => <div data-testid="jockey-avatar" />,
}));

vi.mock("@/components/ui/JargonTooltip", () => ({
  JargonTooltip: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/core/race/transportCost", () => ({
  getTransportCostForRace: () => 200,
}));

import { ReviewStep } from "@/components/race/ReviewStep";

const mockHorse = createTestHorse({ id: "horse-1", name: "Thunder Strike" });
const mockJockey = createTestJockey({ id: "jockey-1", name: "Ruby Walsh" });

const mockRace: Race = {
  id: "race-1",
  name: "Test Stakes",
  day: 1,
  distance: 1600,
  raceClass: "stakes",
  entryFee: 500,
  purse: 10000,
  fieldSize: 8,
  entries: [],
  resolved: false,
};

const mockInstructions: JockeyInstructions = {
  horseId: "horse-1",
  raceId: "race-1",
  ridingStyle: "front_runner",
  earlyPosition: "lead",
  moveTiming: "early",
  aggressiveness: 60,
};

const defaultProps = {
  race: mockRace,
  selectedHorse: mockHorse,
  selectedJockey: mockJockey,
  selectedInstructions: mockInstructions,
  isHorseQualifiedForRace: () => true,
  isNewClaimingRace: false,
  claimingPrice: undefined,
  wantToClaim: false,
  cash: 100000,
};

describe("ReviewStep — rel=noopener noreferrer regression", () => {
  afterEach(() => cleanup());

  it("horse link has target=_blank", () => {
    render(<ReviewStep {...defaultProps} />);
    const horseLink = screen.getByText("Thunder Strike").closest("a");
    expect(horseLink).not.toBeNull();
    expect(horseLink!.getAttribute("target")).toBe("_blank");
  });

  it("horse link has rel=noopener noreferrer", () => {
    render(<ReviewStep {...defaultProps} />);
    const horseLink = screen.getByText("Thunder Strike").closest("a");
    expect(horseLink).not.toBeNull();
    expect(horseLink!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("jockey link has target=_blank", () => {
    render(<ReviewStep {...defaultProps} />);
    const jockeyLink = screen.getByText("Ruby Walsh").closest("a");
    expect(jockeyLink).not.toBeNull();
    expect(jockeyLink!.getAttribute("target")).toBe("_blank");
  });

  it("jockey link has rel=noopener noreferrer", () => {
    render(<ReviewStep {...defaultProps} />);
    const jockeyLink = screen.getByText("Ruby Walsh").closest("a");
    expect(jockeyLink).not.toBeNull();
    expect(jockeyLink!.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
