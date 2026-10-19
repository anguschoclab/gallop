/**
 * races.test.tsx
 *
 * Slice audit for the racing hub: empty browser state uses shared EmptyState
 * with a reset-filters CTA; table markup uses scoped headers.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

import { BrowserTab } from "@/domains/racing/ui/BrowserTab";
import { renderWithStore } from "@/test-utils/renderWithStore";

describe("Races browser", () => {
  afterEach(cleanup);

  it("shows EmptyState with a reset-filters CTA when no races match", () => {
    renderWithStore(createElement(BrowserTab), { races: {} });
    expect(screen.getByText("No races found")).toBeInTheDocument();
    // The filter bar may also expose a reset; the EmptyState must have one too.
    const ctas = screen.getAllByRole("button", { name: "Reset filters" });
    expect(ctas.length).toBeGreaterThan(0);
    expect(() => fireEvent.click(ctas[ctas.length - 1])).not.toThrow();
  });

  it("all <th> elements in racing tables carry scope attributes", () => {
    const raceUi = join(__dirname, "..", "..", "domains", "race", "ui");
    let checked = 0;
    for (const file of readdirSync(raceUi).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(join(raceUi, file), "utf-8");
      for (const th of src.match(/<th[\s>][^>]*>/g) ?? []) {
        expect(th, `${file}: ${th}`).toContain("scope=");
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
