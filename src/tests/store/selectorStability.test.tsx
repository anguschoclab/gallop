import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGame, useGameWithShallow } from "@/game/store";
import { renderWithStore, seedStore } from "@/test-utils/renderWithStore";

function SelectorComponent({ selector, label }: { selector: (s: any) => any; label: string }) {
  const value = useGameWithShallow(selector);
  return <div data-testid={label}>{Array.isArray(value) ? value.length : String(value)}</div>;
}

describe("Selector stability: shallow comparison prevents infinite re-renders", () => {
  it("useGameWithShallow with ?? [] fallback does not cause infinite loop", () => {
    seedStore({ jockeys: undefined });

    // This would throw "Maximum update depth exceeded" if shallow comparison is not working
    const { container } = render(
      <SelectorComponent selector={(s) => s.jockeys ?? []} label="jockey-count" />,
    );

    const el = screen.getByTestId("jockey-count");
    expect(el.textContent).toBe("0");
  });

  it("useGameWithShallow with object selector returns stable reference", () => {
    seedStore({ horses: { h1: { id: "h1", name: "Test" } as any } });

    const { rerender } = render(
      <SelectorComponent selector={(s) => Object.keys(s.horses ?? {})} label="horse-keys" />,
    );

    // Re-render should not cause infinite loop
    rerender(
      <SelectorComponent selector={(s) => Object.keys(s.horses ?? {})} label="horse-keys" />,
    );

    expect(screen.getByTestId("horse-keys").textContent).toBe("1");
  });

  it("useGameWithShallow with array selector returns stable length", () => {
    seedStore({
      campaigns: [{ id: "c1", name: "Campaign 1" } as any, { id: "c2", name: "Campaign 2" } as any],
    });

    render(<SelectorComponent selector={(s) => s.campaigns ?? []} label="campaign-count" />);

    expect(screen.getByTestId("campaign-count").textContent).toBe("2");
  });

  it("useGameWithShallow with undefined array fallback returns 0", () => {
    seedStore({ campaigns: undefined });

    render(<SelectorComponent selector={(s) => s.campaigns ?? []} label="empty-campaigns" />);

    expect(screen.getByTestId("empty-campaigns").textContent).toBe("0");
  });
});
