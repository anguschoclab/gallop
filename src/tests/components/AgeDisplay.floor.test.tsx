import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PlayerConsignmentsPanel } from "@/components/auction/PlayerConsignmentsPanel";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse, AuctionLot, Stable } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: any) => children,
}));

describe("Age display floor", () => {
  it("PlayerConsignmentsPanel uses Math.floor for age", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: { type: "player" } }),
    ) as unknown as Horse;
    horse.age = 5;

    const lot: AuctionLot = {
      id: "lot-1",
      saleId: "sale-1",
      horseId: horse.id,
      consignorId: "player",
      passed: false,
      reservePrice: 10000,
      currentBid: 15000,
      currentBidderId: "npc-1",
    } as unknown as AuctionLot;

    const stable: Stable = {
      id: "npc-1",
      name: "NPC Stable",
    } as unknown as Stable;

    const { container } = render(
      <PlayerConsignmentsPanel playerConsignedLots={[lot]} horses={[horse]} stables={[stable]} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Age 5");
  });

  it("PlayerConsignmentsPanel handles float age with Math.floor", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: { type: "player" } }),
    ) as unknown as Horse;
    horse.age = 5.9;

    const lot: AuctionLot = {
      id: "lot-1",
      saleId: "sale-1",
      horseId: horse.id,
      consignorId: "player",
      passed: false,
      reservePrice: 10000,
      currentBid: 15000,
      currentBidderId: "npc-1",
    } as unknown as AuctionLot;

    const stable: Stable = {
      id: "npc-1",
      name: "NPC Stable",
    } as unknown as Stable;

    const { container } = render(
      <PlayerConsignmentsPanel playerConsignedLots={[lot]} horses={[horse]} stables={[stable]} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Age 5");
    expect(text).not.toContain("5.9");
  });
});
