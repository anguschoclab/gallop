import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareOwnershipPanel } from "@/components/market/ShareOwnershipPanel";
import type { Syndicate } from "@/core/breeding/types";
import type { Horse, Stable } from "@/game/types";

vi.mock("@/core/breeding/devolutionUtils", () => ({
  simulateShareChange: (
    shareHolders: Record<string, number>,
    totalShares: number,
    currentOwner: string,
    sellerId: string,
  ) => {
    const sellerShares = shareHolders[sellerId] ?? 0;
    const newShares = sellerShares - 1;
    if (newShares <= 0 && sellerId === currentOwner) {
      // Find next largest shareholder
      let nextId = null;
      let maxShares = 0;
      for (const [id, shares] of Object.entries(shareHolders)) {
        if (id !== sellerId && shares > maxShares) {
          maxShares = shares;
          nextId = id;
        }
      }
      return { wouldDevolve: true, newOwner: nextId };
    }
    return { wouldDevolve: false, newOwner: null };
  },
}));

const mkSyndicate = (overrides: Partial<Syndicate> = {}): Syndicate =>
  ({
    id: "syn1",
    stallionId: "h1",
    stallionName: "Thunder",
    totalShares: 10,
    sharePrice: 50000,
    studFee: 25000,
    lifetimeEarnings: 1000000,
    shareHolders: { player: 6, npc1: 4 },
    ...overrides,
  }) as Syndicate;

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "npc1",
    name: "NPC Stable",
    owner: "NPC",
    tier: "elite",
    reputation: 50,
    founded: 2020,
    cash: 100000,
    horses: [],
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    personality: "aggressive",
    staff: {},
    outposts: [],
    ...overrides,
  }) as Stable;

describe("ShareOwnershipPanel", () => {
  it("renders shareholder names resolved from npcStables", () => {
    const syndicate = mkSyndicate({ shareHolders: { player: 6, npc1: 4 } });
    const npcStables = [mkStable({ id: "npc1", name: "Rival Ranch" })];

    render(<ShareOwnershipPanel syndicate={syndicate} npcStables={npcStables} />);

    expect(screen.getByText("Your Stable")).toBeInTheDocument();
    expect(screen.getByText("Rival Ranch")).toBeInTheDocument();
  });

  it("falls back to holderId when stable not found in npcStables", () => {
    const syndicate = mkSyndicate({ shareHolders: { player: 6, unknownId: 4 } });

    render(<ShareOwnershipPanel syndicate={syndicate} npcStables={[]} />);

    expect(screen.getByText("unknownId")).toBeInTheDocument();
  });

  it("marks current owner with Crown icon and Owner badge", () => {
    const syndicate = mkSyndicate({ shareHolders: { player: 6, npc1: 4 } });
    const stallion = { id: "h1", stableId: "player" } as Horse;

    render(<ShareOwnershipPanel syndicate={syndicate} stallion={stallion} npcStables={[]} />);

    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("displays share count and percentage for each holder", () => {
    const syndicate = mkSyndicate({ totalShares: 10, shareHolders: { player: 6, npc1: 4 } });
    const npcStables = [mkStable({ id: "npc1", name: "Rival Ranch" })];

    render(<ShareOwnershipPanel syndicate={syndicate} npcStables={npcStables} />);

    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("shows majority threshold", () => {
    const syndicate = mkSyndicate({ totalShares: 10 });

    render(<ShareOwnershipPanel syndicate={syndicate} npcStables={[]} />);

    expect(screen.getByText(/Majority threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/5 shares/i)).toBeInTheDocument();
  });

  it("renders projected devolution section", () => {
    const syndicate = mkSyndicate({ shareHolders: { player: 6, npc1: 4 } });

    render(<ShareOwnershipPanel syndicate={syndicate} npcStables={[]} />);

    expect(screen.getByText(/Projected Devolution/i)).toBeInTheDocument();
  });

  it("sorts shareholders by share count descending", () => {
    const syndicate = mkSyndicate({
      totalShares: 10,
      shareHolders: { player: 3, npc1: 5, npc2: 2 },
    });
    const npcStables = [
      mkStable({ id: "npc1", name: "Alpha Ranch" }),
      mkStable({ id: "npc2", name: "Beta Ranch" }),
    ];

    const { container } = render(
      <ShareOwnershipPanel syndicate={syndicate} npcStables={npcStables} />,
    );

    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
    // First row should have the most shares (npc1 with 5)
    expect(rows[0].textContent).toContain("Alpha Ranch");
    expect(rows[0].textContent).toContain("5");
  });
});
