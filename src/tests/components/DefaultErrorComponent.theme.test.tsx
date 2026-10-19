/**
 * DefaultErrorComponent.theme.test.tsx
 *
 * Verifies the root error boundary renders through semantic theme tokens only
 * (no primitive racing palette classes) and keeps its recovery actions wired.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    search: _search,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useRouter: () => ({ invalidate }),
}));

import { DefaultErrorComponent } from "@/domains/shell/ui/DefaultErrorComponent";

const error = Object.assign(new Error("boom"), {});

describe("DefaultErrorComponent theme", () => {
  it("renders recovery actions", () => {
    const reset = vi.fn();
    render(<DefaultErrorComponent error={error} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });

  it("uses only semantic theme classes — no primitive racing tokens", () => {
    const { container } = render(<DefaultErrorComponent error={error} reset={vi.fn()} />);
    const html = container.innerHTML;
    for (const forbidden of [
      /text-cream/,
      /bg-gold/,
      /bg-t\d{3}/,
      /text-t\d{3}/,
      /border-t\d{3}/,
      /border-gold/,
      /bg-cream/,
      /text-gold/,
    ]) {
      expect(html).not.toMatch(forbidden);
    }
    expect(html).toContain("bg-background");
    expect(html).toContain("text-foreground");
  });
});
