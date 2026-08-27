import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SireSelector } from "@/components/breeding/SireSelector";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("SireSelector — currency formatting", () => {
  it("does not show double $ for standing fee", () => {
    const stallion = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: makePlayerOwned() }),
    ) as unknown as Horse;
    stallion.stud = {
      atStud: true,
      standingFee: 5000,
      lifetimeFoals: 10,
      lifetimeStakesFoals: 2,
      lifetimeG1Foals: 1,
    } as any;

    const { container } = render(
      <SireSelector sireId="" onChange={vi.fn()} availableStallions={[stallion]} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("$5,000");
    expect(text).not.toContain("$$5,000");
  });
});
