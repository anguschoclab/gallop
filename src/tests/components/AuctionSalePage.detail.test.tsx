/**
 * Characterization test for the AuctionSalePage sale-found (catalog/detail) path.
 *
 * midGameSeed() contains no auctions, so the route smoke test only ever hits
 * the not-found branch. This seeds a real sale + lot + horse and pins the
 * detail composition (SaleHeader / CatalogIndex / LotDetailPanel /
 * BiddingPanel) before the page-section extraction refactor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

vi.mock("@/domains/agents/simulation/npc/scouting", () => ({
  getDisplayableStats: () => ({ stats: null, overallEstimate: null }),
}));

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";
import { hydrationComplete } from "@/platform/game/store/storage";
import AuctionSalePage from "@/domains/auction/ui/pages/AuctionSalePage";
import { h2r } from "@/tests/helpers/sampleGameState";

// routerMock's useParams returns saleId: "mock-sale-id"
const lot = {
  id: "lot1",
  horseId: "h1",
  consignorStableId: "s1",
  saleId: "mock-sale-id",
  reservePrice: 1000,
  passed: false,
  withdrawn: false,
};

const sale = {
  id: "mock-sale-id",
  name: "Elite Yearling Sale",
  day: 999, // deliberately not the current day → catalog/detail path, not the theater
  kind: "yearling",
  resolved: false,
  lots: [lot],
};

const horse = {
  id: "h1",
  name: "Test Filly",
  age: 1,
  gender: "filly",
  coatColor: "bay",
  markings: [],
  appearance: {},
  sireName: "Test Sire",
  damName: "Test Dam",
};

const consignor = {
  id: "s1",
  name: "Godolphin",
  isMajor: true,
  colors: { primary: "#1133aa", secondary: "#ffffff" },
  personality: "aggressive",
  cash: 0,
  country: "USA",
};

beforeEach(() => {
  hydrationComplete.value = true;
  sessionStorage.clear();
});

afterEach(() => {
  hydrationComplete.value = false;
});

describe("AuctionSalePage (sale found)", () => {
  it("renders the catalog + lot detail + bidding panel composition", () => {
    renderWithStore(<AuctionSalePage />, {
      ...midGameSeed(),
      auctions: [sale],
      horses: h2r([horse] as any),
      npcStables: [consignor],
      scoutReports: [],
      day: 120,
      cash: 250_000,
    } as any);

    // SaleHeader
    expect(screen.getByText("Elite Yearling Sale")).toBeInTheDocument();
    // LotDetailPanel + CatalogIndex both render the horse name
    expect(screen.getAllByText("Test Filly").length).toBeGreaterThan(0);
    expect(screen.getByText(/Technical Specifications/)).toBeInTheDocument();
    // BiddingPanel (reserve 1000, price 0 → not met)
    expect(screen.getByText("Bid", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Current Bid")).toBeInTheDocument();
    expect(screen.getByText("Reserve not met")).toBeInTheDocument();
  });
});
