import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import type { Horse, Stable, PrivateSaleOffer } from "@/game/types";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: "h1",
  fromStableId: undefined,
  toStableId: "s1",
  amount: 5000,
  counterAmount: 8000,
  status: "countered",
  createdDay: 1,
  expiresDay: 10,
  ...overrides,
});

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    ...overrides,
  }) as Horse;

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "s1",
    name: "Rival Stable",
    personality: "aggressive",
    cash: 100000,
    horses: [],
    ...overrides,
  }) as Stable;

describe("PrivateSaleCounterCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when status is not 'countered'", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer({ status: "pending", counterAmount: undefined })}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when counterAmount is undefined", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer({ status: "countered", counterAmount: undefined })}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders stable name and counter amount", () => {
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable({ name: "Green Acres" })}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    expect(screen.getByText(/Green Acres/i)).toBeTruthy();
    expect(screen.getAllByText(/\$8,000/i).length).toBeGreaterThan(0);
  });

  it("renders expiry day", () => {
    render(
      <PrivateSaleCounterCard
        offer={mkOffer({ expiresDay: 42 })}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    expect(screen.getByText(/Expires day 42/i)).toBeTruthy();
  });

  it("decline button calls onRespond with false", () => {
    const onRespond = vi.fn(() => ({ ok: true }));
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Decline/i }));
    expect(onRespond).toHaveBeenCalledWith("offer-1", false);
  });

  it("decline button shows info toast", () => {
    const onRespond = vi.fn(() => ({ ok: true }));
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Decline/i }));
    expect(toast.info).toHaveBeenCalledWith("Counter declined.");
  });

  it("accept dialog opens on button click", async () => {
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept \$8,000/i }));
    expect(screen.getByText(/Accept counter offer/i)).toBeTruthy();
  });

  it("accept confirmation calls onRespond with true", () => {
    const onRespond = vi.fn(() => ({ ok: true }));
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept \$8,000/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/i }));
    expect(onRespond).toHaveBeenCalledWith("offer-1", true);
  });

  it("accept success shows toast with horse name and amount", () => {
    const onRespond = vi.fn(() => ({ ok: true }));
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse({ name: "Lightning" })}
        stable={mkStable()}
        cash={10000}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept \$8,000/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/i }));
    expect(toast.success).toHaveBeenCalledWith("Lightning joins your stable for $8,000.");
  });

  it("accept failure shows error toast with reason", () => {
    const onRespond = vi.fn(() => ({ ok: false, reason: "insufficient_funds" }));
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept \$8,000/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/i }));
    expect(toast.error).toHaveBeenCalledWith("insufficient_funds");
  });
});
