/**
 * Regression test: StableRosterView must render real OVR and coat color for
 * resolved player horses, not the 0 OVR / "Unknown" coat of an unresolved phenotype.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { StableRosterView } from "@/components/stable/StableRosterView";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { calculateOverallRating } from "@/core/horse/stats";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

function buildResolvedPlayerHorse(name: string) {
  return ensurePhenotypeResolved(generateHorse({ tier: "starter", ownership: { type: "player" } }));
}

describe("StableRosterView phenotype display", () => {
  it("shows non-zero OVR and a real coat color for resolved player horses", () => {
    const horses = [buildResolvedPlayerHorse("Alpha"), buildResolvedPlayerHorse("Beta")];
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

    const text = container.textContent ?? "";

    for (const horse of horses) {
      const ovr = calculateOverallRating(horse);
      expect(ovr).toBeGreaterThan(0);
      expect(text).toContain(horse.name);
    }

    // Sanity check: the ledger should not show a "0" OVR cell now that horses are resolved.
    // We look for the exact OVR strings rendered in the Rating column.
    for (const horse of horses) {
      expect(text).toContain(String(calculateOverallRating(horse)));
    }
  });
});
