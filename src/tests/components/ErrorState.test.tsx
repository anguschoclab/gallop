/**
 * ErrorState.test.tsx
 *
 * Verifies the shared ErrorState primitive: alert role, retry action, and
 * secondary navigation affordance.
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
}));

import { ErrorState } from "@/shared/ui/common/ErrorState";

describe("ErrorState", () => {
  it("renders an alert with default copy", () => {
    render(<ErrorState />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("An unexpected error occurred");
  });

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders a back link defaulting to the dashboard", () => {
    render(<ErrorState />);
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });

  it("honours custom copy and labels", () => {
    render(
      <ErrorState
        title="Race unavailable"
        description="This race could not be loaded."
        retryLabel="Reload"
        backTo="/racing"
        backLabel="Back to races"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Race unavailable");
    expect(screen.getByRole("link", { name: "Back to races" })).toHaveAttribute("href", "/racing");
  });
});
