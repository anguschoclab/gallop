/**
 * StableIdentityCard.test.tsx - Settings stable identity card contracts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { useGame } from "@/platform/game/store";
import { StableIdentityCard } from "@/domains/settings/ui/StableIdentityCard";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

describe("StableIdentityCard", () => {
  beforeEach(() => {
    useGame.setState({
      playerProfile: {
        owner: createStubPersonIdentity({
          id: "player",
          displayName: "Casey Owner",
          nationality: "USA",
        }),
        stableName: "Casey Racing",
      } as any,
    });
  });

  it("renders owner portrait, name, stable, and a randomize control", () => {
    render(createElement(StableIdentityCard));
    expect(screen.getByText("Stable Identity")).toBeTruthy();
    expect(screen.getByText("Casey Owner")).toBeTruthy();
    expect(screen.getByText("Casey Racing")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Randomize Portrait" });
    expect(btn).toBeTruthy();
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("renders nothing without a player profile", () => {
    useGame.setState({ playerProfile: undefined as any });
    const { container } = render(createElement(StableIdentityCard));
    expect(container.innerHTML).toBe("");
  });
});
