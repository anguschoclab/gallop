import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { StableRosterView } from "@/components/stable/StableRosterView";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

function buildResolvedPlayerHorse(name: string) {
  return ensurePhenotypeResolved(generateHorse({ tier: "starter", ownership: { type: "player" } }));
}

describe("StableRosterView — OVR label", () => {
  it("displays 'OVR' as the rating column header in ledger view", () => {
    const horses = [buildResolvedPlayerHorse("Alpha")];
    const { container } = render(
      <StableRosterView
        horses={horses}
        status="active"
        view="ledger"
        counts={{ active: horses.length, retired: 0, auctioned: 0, all: horses.length }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );

    const headerText = container.querySelector("thead")?.textContent ?? "";
    expect(headerText).toContain("OVR");
    expect(headerText).not.toContain("Rating");
  });
});
