import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CareerArcPanel } from "@/components/horse/CareerArcPanel";
import type { CareerArcState } from "@/services/narrative/careerArcGenerator";

vi.mock("@/game/store", () => ({
  useGameWithShallow: vi.fn(),
  useGame: vi.fn(),
}));

import { useGameWithShallow } from "@/game/store";

describe("CareerArcPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when no narrativeArcs exist for horse", () => {
    vi.mocked(useGameWithShallow).mockReturnValue(undefined);
    const { container } = render(<CareerArcPanel horseId="horse-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when narrativeArcs is undefined", () => {
    vi.mocked(useGameWithShallow).mockReturnValue(undefined);
    const { container } = render(<CareerArcPanel horseId="horse-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders panel when career arc exists for horse", () => {
    const arcState: CareerArcState = {
      horseId: "horse-1",
      stage: "rising_star",
      stage1Day: 15,
      consecutiveLosses: 0,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(arcState);

    render(<CareerArcPanel horseId="horse-1" />);

    expect(screen.getByText(/Career Arc/i)).toBeInTheDocument();
    expect(screen.getByText("Rising Star")).toBeInTheDocument();
  });

  it("displays stage transition day", () => {
    const arcState: CareerArcState = {
      horseId: "horse-1",
      stage: "contender",
      stage1Day: 15,
      stage2Day: 30,
      consecutiveLosses: 2,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(arcState);

    render(<CareerArcPanel horseId="horse-1" />);

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("displays consecutive losses", () => {
    const arcState: CareerArcState = {
      horseId: "horse-1",
      stage: "contender",
      stage1Day: 15,
      stage2Day: 30,
      consecutiveLosses: 3,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(arcState);

    render(<CareerArcPanel horseId="horse-1" />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders complete stage with completion indicator", () => {
    const arcState: CareerArcState = {
      horseId: "horse-1",
      stage: "complete",
      stage1Day: 15,
      stage2Day: 30,
      stage3Day: 45,
      consecutiveLosses: 0,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(arcState);

    render(<CareerArcPanel horseId="horse-1" />);

    expect(screen.getByText(/Complete/i)).toBeInTheDocument();
  });

  it("renders none stage as not started", () => {
    const arcState: CareerArcState = {
      horseId: "horse-1",
      stage: "none",
      consecutiveLosses: 0,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(arcState);

    render(<CareerArcPanel horseId="horse-1" />);

    expect(screen.getByText(/None/i)).toBeInTheDocument();
  });
});
