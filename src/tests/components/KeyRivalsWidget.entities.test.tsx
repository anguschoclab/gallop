import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { KeyRivalsWidget } from "@/components/dashboard/KeyRivalsWidget";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("KeyRivalsWidget — entity linking", () => {
  it("renders rival stable name as a Link to /npc-stables/$stableId", () => {
    const rivals = [{ stable: { id: "npc1", name: "Rival Stable" }, friction: 75 }];
    const { container } = renderWithStore(
      <KeyRivalsWidget rivals={rivals} calculateHeadToHead={() => ({ wins: 1, losses: 2 })} />,
    );
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Rival Stable");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ stableId: "npc1" }));
  });

  it("renders multiple rival stable links", () => {
    const rivals = [
      { stable: { id: "npc1", name: "Rival A" }, friction: 80 },
      { stable: { id: "npc2", name: "Rival B" }, friction: 60 },
    ];
    const { container } = renderWithStore(
      <KeyRivalsWidget rivals={rivals} calculateHeadToHead={() => ({ wins: 0, losses: 0 })} />,
    );
    const links = container.querySelectorAll("a[to='/npc-stables/$stableId']");
    expect(links).toHaveLength(2);
  });
});
