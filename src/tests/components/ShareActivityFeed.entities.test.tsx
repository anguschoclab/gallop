import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { ShareActivityFeed } from "@/components/market/ShareActivityFeed";
import { createTestStable } from "@/tests/helpers";
import type { ShareActivityFeedItem } from "@/core/breeding/types";

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

describe("ShareActivityFeed — entity linking", () => {
  it("renders NPC stable names as Links to /npc-stables/$stableId", () => {
    const stable = createTestStable({ id: "npc1", name: "Rival Stables" });
    const item: ShareActivityFeedItem = {
      id: "sa1",
      syndicateId: "syn1",
      syndicateName: "Syndicate One",
      type: "share_purchase",
      buyerStableId: "npc1",
      sellerStableId: "player",
      shares: 10,
      pricePerShare: 1000,
      cashMoved: 10000,
      day: 50,
    };

    const { container } = renderWithStore(<ShareActivityFeed />, {
      ...createDefaultGameState(),
      npcStables: [stable],
      shareActivityFeed: [item],
    });
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Rival Stables");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ stableId: "npc1" }));
  });

  it("keeps player/treasury/market as plain text (not linked)", () => {
    const item: ShareActivityFeedItem = {
      id: "sa1",
      syndicateId: "syn1",
      syndicateName: "Syndicate One",
      type: "share_purchase",
      buyerStableId: "player",
      sellerStableId: "treasury",
      shares: 5,
      pricePerShare: 500,
      cashMoved: 2500,
      day: 50,
    };

    const { container } = renderWithStore(<ShareActivityFeed />, {
      ...createDefaultGameState(),
      shareActivityFeed: [item],
    });
    const links = container.querySelectorAll("a[to='/npc-stables/$stableId']");
    expect(links).toHaveLength(0);
  });
});
