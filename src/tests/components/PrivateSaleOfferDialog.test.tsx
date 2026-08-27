import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivateSaleOfferDialog } from "@/components/auction/PrivateSaleOfferDialog";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/game/store";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { Horse, Stable } from "@/game/types";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makeNpcOwned } from "@/core/horse/ownership";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: "h1",
    name: "Thunder",
    ownership: makeNpcOwned("s1"),
    ...overrides,
  });

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "s1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["h1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
    ...overrides,
  }) as Stable;

describe("PrivateSaleOfferDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with horse name in title", () => {
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={mkHorse({ name: "Lightning" })}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[mkHorse()]}
      />,
    );
    expect(screen.getByText(/Make an offer for Lightning/i)).toBeTruthy();
  });

  it("renders estimated market value range", () => {
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={mkHorse()}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[mkHorse()]}
      />,
    );
    expect(screen.getByText(/Estimated market value/i)).toBeTruthy();
  });

  it("shows error for empty offer amount", () => {
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={mkHorse()}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[mkHorse()]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(screen.getByText(/Please enter a valid offer amount/i)).toBeTruthy();
  });

  it("shows error for zero offer amount", () => {
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={mkHorse()}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[mkHorse()]}
      />,
    );
    const input = screen.getByPlaceholderText(/e\.g\. 25000/i);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(screen.getByText(/Please enter a valid offer amount/i)).toBeTruthy();
  });

  it("shows error for insufficient cash", () => {
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={mkHorse()}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={5000}
        allHorses={[mkHorse()]}
      />,
    );
    const input = screen.getByPlaceholderText(/e\.g\. 25000/i);
    fireEvent.change(input, { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(screen.getByText(/Insufficient funds/i)).toBeTruthy();
    expect(screen.getByText(/\$5,000 more/i)).toBeTruthy();
  });

  it("closes dialog on successful offer", () => {
    const onClose = vi.fn();
    const horse = mkHorse();
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={horse}
        stable={mkStable()}
        isOpen={true}
        onClose={onClose}
        cash={100000}
        allHorses={[horse]}
      />,
      {
        cash: 100000,
        horses: h2r([horse]),
        npcStables: [mkStable()],
        privateSaleOffers: [],
      },
    );
    const input = screen.getByPlaceholderText(/e\.g\. 25000/i);
    fireEvent.change(input, { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows success toast on submitted offer (POST-FIX)", () => {
    const horse = mkHorse();
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={horse}
        stable={mkStable({ name: "Green Acres", personality: "aggressive" })}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[horse]}
      />,
      {
        cash: 100000,
        horses: h2r([horse]),
        npcStables: [mkStable({ name: "Green Acres", personality: "aggressive" })],
        privateSaleOffers: [],
      },
    );
    const input = screen.getByPlaceholderText(/e\.g\. 25000/i);
    fireEvent.change(input, { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Offer of $25,000 submitted for Thunder"),
    );
  });

  it("shows error when proposePrivateSale returns insufficient_funds", () => {
    const horse = mkHorse();
    renderWithStore(
      <PrivateSaleOfferDialog
        horse={horse}
        stable={mkStable()}
        isOpen={true}
        onClose={vi.fn()}
        cash={100000}
        allHorses={[horse]}
      />,
      {
        cash: 100,
        horses: h2r([horse]),
        npcStables: [mkStable()],
        privateSaleOffers: [],
      },
    );
    const input = screen.getByPlaceholderText(/e\.g\. 25000/i);
    fireEvent.change(input, { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Offer/i }));
    expect(screen.getByText(/Insufficient funds/i)).toBeTruthy();
  });
});
