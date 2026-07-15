import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { StableRosterView } from "@/components/stable/StableRosterView";
import { HorseCardCompact } from "@/components/horse/HorseCardCompact";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

vi.mock("@/hooks/horse/useHorseCard", () => ({
  useHorseCard: () => ({
    ovr: 50,
    scoutStatus: null,
    isAdvanced: false,
    ageLabel: "3YO",
  }),
}));

describe("Energy display rounding", () => {
  it("HorseCardCompact shows rounded energy", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", owned: true }),
    ) as unknown as Horse;
    horse.energy = 84.7;

    const { container } = render(
      <HorseCardCompact horse={horse} hookData={{} as any} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("E:85%");
    expect(text).not.toContain("84.7");
  });

  it("StableRosterView shows rounded energy", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", owned: true }),
    ) as unknown as Horse;
    horse.energy = 72.3;
    horse.lifecycleStatus = "active";

    const { container } = render(
      <StableRosterView
        horses={[horse]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("E:72%");
    expect(text).not.toContain("72.3");
  });
});
