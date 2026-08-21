import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TrainingPanel } from "@/components/horse/TrainingPanel";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: React.ReactNode }) => children,
  useNavigate: () => () => {},
}));

describe("TrainingPanel — display rounding", () => {
  it("displays rounded current and next stat values", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: { type: "player" } }),
    ) as unknown as Horse;
    // Inject a float stat to test rounding
    horse.stats.speed = 38.395981615409255;
    horse.potential = 80;
    horse.energy = 50;

    const { container } = render(
      <TrainingPanel
        horse={horse}
        isPregnant={false}
        slotsLeft={3}
        cash={100000}
        facilities={null}
        onTrain={vi.fn()}
      />,
    );

    const text = container.textContent ?? "";
    // Should contain "38 →" (rounded), not "38.395..."
    expect(text).toContain("38 →");
    expect(text).not.toContain("38.395");
    // Should contain "→ 39" (rounded + 1), not "→ 39.395..."
    expect(text).toContain("→ 39");
    expect(text).not.toContain("39.395");
  });
});
