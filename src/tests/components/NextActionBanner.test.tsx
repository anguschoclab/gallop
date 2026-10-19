/**
 * NextActionBanner.test.tsx
 *
 * Verifies the dashboard next-action banner contract: one primary CTA,
 * accessible region labeling, and dismiss behavior.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    search: _search,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
}));

import { NextActionBanner } from "@/domains/dashboard/ui/NextActionBanner";
import type { NextAction } from "@/domains/dashboard/simulation/nextAction";

const action: NextAction = {
  kind: "auction",
  label: "Visit the sales ring",
  detail: "2 sales are open",
  to: "/auction",
};

describe("NextActionBanner", () => {
  it("renders the action as a labelled region with a single CTA link", () => {
    const { container } = render(<NextActionBanner action={action} />);
    const region = container.querySelector('[aria-label="Next action"]');
    expect(region).not.toBeNull();
    expect(region!.querySelectorAll("a")).toHaveLength(1);
    expect(screen.getByText("Visit the sales ring")).toBeInTheDocument();
    expect(screen.getByText("2 sales are open")).toBeInTheDocument();
  });

  it("CTA link carries an accessible label combining label and detail", () => {
    render(<NextActionBanner action={action} />);
    expect(
      screen.getByRole("link", { name: "Visit the sales ring: 2 sales are open" }),
    ).toBeInTheDocument();
  });

  it("invokes onDismiss with the action kind", () => {
    const onDismiss = vi.fn();
    render(<NextActionBanner action={action} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss next action/i }));
    expect(onDismiss).toHaveBeenCalledWith("auction");
  });

  it("omits the dismiss button when no handler is given", () => {
    render(<NextActionBanner action={action} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
