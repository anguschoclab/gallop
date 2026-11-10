/**
 * Characterization test for BreedingCompatibilityCard.
 *
 * Pins the rendered factor set (Nicking/Dosage/Inbreeding/COI Depth/Parent
 * Performance/Blue Hen — crossFamily intentionally unrendered), the score badge,
 * and the recommendation text before the radar-data/factor-row extraction.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BreedingCompatibilityCard } from "@/domains/breeding/ui/BreedingCompatibilityCard";
import type { BreedingCompatibilityResult } from "@/platform/game/types";

const factor = (score: number, extra: Record<string, unknown> = {}) => ({
  score,
  description: `desc-${score}`,
  ...extra,
});

const compatibility: BreedingCompatibilityResult = {
  overallScore: 0.7,
  recommendation: "Strong match",
  factors: {
    nicking: factor(0.8),
    dosage: factor(0.75),
    inbreeding: factor(0.5),
    parentPerformance: factor(0.6),
    conformation: factor(0.5),
    temperament: factor(0.5),
    foundationStock: factor(0.5),
    founderEffect: factor(0.5),
    genetic: factor(0.5),
    blueHen: { score: 0.9, description: "Blue hen desc", isBlueHen: true },
    crossFamily: factor(0.99),
  },
};

describe("BreedingCompatibilityCard", () => {
  it("renders the overall score badge and recommendation", () => {
    render(<BreedingCompatibilityCard compatibility={compatibility} />);
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    expect(screen.getByText("Breeding Compatibility Details")).toBeInTheDocument();
  });

  it("renders the current factor rows with their descriptions", () => {
    render(<BreedingCompatibilityCard compatibility={compatibility} />);
    expect(screen.getByText("Nicking")).toBeInTheDocument();
    expect(screen.getByText("Dosage")).toBeInTheDocument();
    expect(screen.getByText("Inbreeding")).toBeInTheDocument();
    expect(screen.getByText("8 generations (weighted)")).toBeInTheDocument();
    expect(screen.getByText("Parent Performance")).toBeInTheDocument();
    expect(screen.getByText("Blue Hen Status")).toBeInTheDocument();
    expect(screen.getByText("desc-0.8")).toBeInTheDocument();
    expect(screen.getByText("desc-0.75")).toBeInTheDocument();
    expect(screen.getByText("Blue hen desc")).toBeInTheDocument();
  });

  it("does not render crossFamily (intentionally unrendered today)", () => {
    render(<BreedingCompatibilityCard compatibility={compatibility} />);
    expect(screen.queryByText("desc-0.99")).not.toBeInTheDocument();
  });
});
