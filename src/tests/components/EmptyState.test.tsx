/**
 * EmptyState.test.tsx
 *
 * Verifies the shared EmptyState primitive: title/description rendering,
 * single-CTA discipline (link vs button), and optional children.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Trophy } from "lucide-react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    search: _search,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
}));

import { EmptyState } from "@/shared/ui/common/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon={Trophy} title="No horses yet" description="Buy your first horse." />);
    expect(screen.getByText("No horses yet")).toBeInTheDocument();
    expect(screen.getByText("Buy your first horse.")).toBeInTheDocument();
  });

  it("renders a link CTA when action.to is provided", () => {
    render(
      <EmptyState
        icon={Trophy}
        title="No horses yet"
        action={{ label: "Visit the auction", to: "/auction" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Visit the auction" });
    expect(link).toHaveAttribute("href", "/auction");
  });

  it("renders a button CTA and calls onClick when no route is provided", () => {
    const onClick = vi.fn();
    render(<EmptyState icon={Trophy} title="Empty" action={{ label: "Do thing", onClick }} />);
    fireEvent.click(screen.getByRole("button", { name: "Do thing" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders at most one CTA", () => {
    render(
      <EmptyState icon={Trophy} title="Empty" action={{ label: "Only CTA", to: "/stable" }} />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders without an action and supports children", () => {
    render(
      <EmptyState icon={Trophy} title="Empty">
        <span data-testid="extra">extra</span>
      </EmptyState>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });
});
