import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { AuctionHouseDesk } from "@/domains/market/ui/AuctionHouseDesk";
import { createTestHorse } from "@/tests/helpers";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";
import { h2r } from "@/tests/helpers/sampleGameState";
import { asHorseId } from "@/shared/types/branded";

vi.mock("@tanstack/react-router", () => createRouterMock());

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function seedWithSellableHorse() {
  const horse = createTestHorse({
    id: asHorseId("h-sell-1"),
    name: "Sellable Sue",
    ownership: makePlayerOwned(),
    lifecycleStatus: "active",
  });
  const sellSpy = vi.fn(() => ({ ok: true }));
  const buySpy = vi.fn(() => ({ ok: true }));
  renderWithStore(<AuctionHouseDesk />, {
    day: 100,
    cash: 500_000,
    horses: h2r([horse]),
    sellHorseToAuctionHouse: sellSpy,
    buyHorseFromAuctionHouse: buySpy,
  } as Parameters<typeof renderWithStore>[1]);
  return { horse, sellSpy, buySpy };
}

describe("AuctionHouseDesk sell confirmation", () => {
  it("opens a confirmation dialog instead of selling immediately", () => {
    const { sellSpy } = seedWithSellableHorse();
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.getByText(/Sell Sellable Sue\?/i)).toBeTruthy();
    expect(sellSpy).not.toHaveBeenCalled();
  });

  it("completes the sale only after Confirm Sale", () => {
    const { sellSpy } = seedWithSellableHorse();
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Sale" }));
    expect(sellSpy).toHaveBeenCalledTimes(1);
    expect(sellSpy).toHaveBeenCalledWith("h-sell-1", expect.any(String));
  });

  it("cancel closes the dialog without selling", () => {
    const { sellSpy } = seedWithSellableHorse();
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(sellSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Sell Sellable Sue\?/i)).toBeNull();
  });
});
