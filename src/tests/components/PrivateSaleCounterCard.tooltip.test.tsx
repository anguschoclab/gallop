import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import type { Horse, Stable, PrivateSaleOffer } from "@/game/types";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer1",
  horseId: "h1",
  fromStableId: "s1",
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
    ...overrides,
  }) as Stable;

describe("PrivateSaleCounterCard — tooltip on disabled button", () => {
  it("renders tooltip wrapper when cash is insufficient", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={1000}
        onRespond={vi.fn()}
      />,
    );
    // Radix tooltip provider is a context wrapper (no DOM element),
    // but the wrapper span with tabIndex and cursor-not-allowed is rendered
    const wrapperSpan = container.querySelector("span.cursor-not-allowed");
    expect(wrapperSpan).toBeTruthy();
  });

  it("does not render tooltip wrapper when cash is sufficient", () => {
    render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={10000}
        onRespond={vi.fn()}
      />,
    );
    expect(screen.queryByText("Insufficient funds")).toBeNull();
    expect(screen.getByText(/Accept/i)).toBeTruthy();
  });

  it("wrapper span has tabIndex={0}", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={1000}
        onRespond={vi.fn()}
      />,
    );
    const span = container.querySelector("span[tabindex='0']");
    expect(span).toBeTruthy();
  });

  it("wrapper span has cursor-not-allowed class", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={1000}
        onRespond={vi.fn()}
      />,
    );
    const span = container.querySelector("span.cursor-not-allowed");
    expect(span).toBeTruthy();
  });

  it("disabled button has pointer-events-none class", () => {
    const { container } = render(
      <PrivateSaleCounterCard
        offer={mkOffer()}
        horse={mkHorse()}
        stable={mkStable()}
        cash={1000}
        onRespond={vi.fn()}
      />,
    );
    const btn = container.querySelector("button.pointer-events-none");
    expect(btn).toBeTruthy();
    expect(btn?.hasAttribute("disabled")).toBe(true);
  });
});
