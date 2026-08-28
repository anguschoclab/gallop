/**
 * ResolvedSaleSummary component tests
 *
 * Verifies sold/passed counts are computed correctly.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResolvedSaleSummary } from "@/components/auction/ResolvedSaleSummary";
import type { AuctionLot, Horse, AuctionSale } from "@/game/types";

function mkLot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return {
    id: "lot-1",
    horseId: "h1",
    saleId: "s1",
    reservePrice: 50000,
    passed: false,
    withdrawn: false,
    ...overrides,
  };
}

const horseMap = new Map<string, Horse>([
  ["h1", { id: "h1", name: "Test Horse" } as Horse],
  ["h2", { id: "h2", name: "Another Horse" } as Horse],
]);

const testSale = {
  id: "s1",
  name: "Test Sale",
  day: 1,
  kind: "yearling",
  lots: [],
  resolved: true,
} as unknown as AuctionSale;

describe("ResolvedSaleSummary sold/passed counts", () => {
  afterEach(() => cleanup());

  it("counts sold lots (hammerPrice set, not passed)", () => {
    const lots = [
      mkLot({ id: "l1", horseId: "h1", hammerPrice: 100000, passed: false }),
      mkLot({ id: "l2", horseId: "h2", hammerPrice: 200000, passed: false }),
    ];
    render(<ResolvedSaleSummary activeLots={lots} horseMap={horseMap} sale={testSale} />);
    // Total and Sold both show 2
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(2);
  });

  it("counts passed lots separately from sold", () => {
    const lots = [
      mkLot({ id: "l1", horseId: "h1", hammerPrice: 100000, passed: false }),
      mkLot({ id: "l2", horseId: "h2", passed: true }),
    ];
    render(<ResolvedSaleSummary activeLots={lots} horseMap={horseMap} sale={testSale} />);
    // Total: 2, Sold: 1, Passed: 1
    expect(screen.getByText("2")).toBeDefined(); // Total
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(2); // Sold + Passed
  });

  it("lots with no hammerPrice and not passed are counted as neither", () => {
    const lots = [
      mkLot({ id: "l1", horseId: "h1", hammerPrice: 100000, passed: false }),
      mkLot({ id: "l2", horseId: "h2", hammerPrice: undefined, passed: false }),
      mkLot({ id: "l3", horseId: "h1", passed: true }),
    ];
    render(<ResolvedSaleSummary activeLots={lots} horseMap={horseMap} sale={testSale} />);
    // Total: 3, Sold: 1, Passed: 1
    expect(screen.getByText("3")).toBeDefined(); // Total
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(2); // Sold + Passed
  });

  it("handles all passed lots", () => {
    const lots = [
      mkLot({ id: "l1", horseId: "h1", passed: true }),
      mkLot({ id: "l2", horseId: "h2", passed: true }),
    ];
    render(<ResolvedSaleSummary activeLots={lots} horseMap={horseMap} sale={testSale} />);
    // Total: 2, Sold: 0, Passed: 2
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(2); // Total + Passed
    expect(screen.getByText("0")).toBeDefined(); // Sold
  });
});
