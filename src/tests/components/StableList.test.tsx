import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Stable } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { StableList } from "@/components/stable/StableList";

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "elite",
    reputation: 50,
    founded: 2020,
    cash: 100000,
    horses: [],
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    personality: "aggressive",
    staff: {},
    outposts: [],
    ...overrides,
  }) as Stable;

describe("StableList", () => {
  it("renders section heading with provided title text", () => {
    render(
      <StableList
        title="Elite Stables"
        icon={<span data-testid="icon" />}
        stables={[mkStable()]}
      />,
    );
    expect(screen.getByText("Elite Stables")).toBeInTheDocument();
  });

  it("renders provided icon element", () => {
    render(
      <StableList
        title="Elite Stables"
        icon={<span data-testid="custom-icon" />}
        stables={[mkStable()]}
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders one StableCard per stable in the array", () => {
    const stables = [
      mkStable({ id: "s1", name: "Alpha Stable" }),
      mkStable({ id: "s2", name: "Beta Stable" }),
      mkStable({ id: "s3", name: "Gamma Stable" }),
    ];
    render(<StableList title="Test" icon={<span />} stables={stables} />);
    expect(screen.getByText("Alpha Stable")).toBeInTheDocument();
    expect(screen.getByText("Beta Stable")).toBeInTheDocument();
    expect(screen.getByText("Gamma Stable")).toBeInTheDocument();
  });

  it("renders nothing (null) when stables array is empty", () => {
    const { container } = render(<StableList title="Empty" icon={<span />} stables={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies custom className to the section wrapper", () => {
    const { container } = render(
      <StableList title="Custom" icon={<span />} stables={[mkStable()]} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
