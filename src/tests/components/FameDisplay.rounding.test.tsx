import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { HorseCardHeader } from "@/components/horse/HorseCardHeader";
import { StallionCard } from "@/components/breeding/StallionCard";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
}));

describe("Fame display rounding", () => {
  it("HorseCardHeader shows rounded fame", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", owned: true }),
    ) as unknown as Horse;
    horse.fame = 12.5;

    const { container } = render(
      <HorseCardHeader horse={horse} genderColor="text-blue-400" />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Fame 13");
    expect(text).not.toContain("12.5");
  });

  it("StallionCard shows rounded fame", () => {
    const stallion = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", owned: true }),
    ) as unknown as Horse;
    stallion.fame = 8.5;
    stallion.stud = {
      atStud: true,
      standingFee: 5000,
      lifetimeFoals: 10,
      lifetimeStakesFoals: 2,
      lifetimeG1Foals: 1,
    } as any;
    stallion.hemisphere = "Northern";

    const { container } = render(
      <StallionCard
        stallion={stallion}
        stableName="Test Stable"
        day={200}
        mare={undefined}
        cash={100000}
        onBook={vi.fn()}
      />,
    );

    const text = container.textContent ?? "";
    // Fame 8.5 → Math.round → 9
    expect(text).toContain("9");
    expect(text).not.toContain("8.5");
  });
});
