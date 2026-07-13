import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const invalidate = vi.fn();
const reset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: { children?: ReactNode; to?: string } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useRouter: () => ({ invalidate }),
}));

import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";

describe("DefaultErrorComponent", () => {
  beforeEach(() => {
    invalidate.mockClear();
    reset.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 'Go home' as a Link with to=\"/\"", () => {
    render(createElement(DefaultErrorComponent, { error: new Error("boom"), reset }));
    const goHome = screen.getByText("Go home");
    expect(goHome.tagName).toBe("A");
    expect(goHome.getAttribute("href")).toBe("/");
  });

  it("Try again button calls router.invalidate() and reset()", () => {
    render(createElement(DefaultErrorComponent, { error: new Error("boom"), reset }));
    fireEvent.click(screen.getByText("Try again"));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does NOT assign to window.location.href", () => {
    const originalHref = window.location.href;
    render(createElement(DefaultErrorComponent, { error: new Error("boom"), reset }));
    fireEvent.click(screen.getByText("Try again"));
    expect(window.location.href).toBe(originalHref);
  });
});
