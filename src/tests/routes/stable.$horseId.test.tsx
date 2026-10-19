/**
 * stable.$horseId.test.tsx
 *
 * Slice audit for the horse detail route: not-found uses the shared
 * ErrorState primitive; the page's sticky nav labels are readable
 * (text-sm, not tiny uppercase).
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode, type ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => {
  const mock = createRouterMock();
  return {
    ...mock,
    Link: ({
      to,
      children,
      ...props
    }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
      createElement("a", { href: to, ...props }, children),
    useNavigate: () => vi.fn(),
  };
});

import { Route } from "@/routes/stable.$horseId";

describe("Horse detail route", () => {
  it("not-found state uses ErrorState with a back link to /stable", () => {
    const NotFound = (Route as unknown as { options: { notFoundComponent: ComponentType } }).options
      .notFoundComponent;
    render(createElement(NotFound));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Horse not found");
    expect(screen.getByRole("link", { name: "Back to Stable" })).toHaveAttribute("href", "/stable");
  });

  it("sticky section nav labels use readable small text, not tiny uppercase", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "domains", "horse", "ui", "pages", "HorseDetail.tsx"),
      "utf-8",
    );
    expect(src).toMatch(/text-sm font-medium border-l-2/);
    expect(src).not.toMatch(/text-\[10px\] font-black uppercase tracking-wide border-l-2/);
  });
});
