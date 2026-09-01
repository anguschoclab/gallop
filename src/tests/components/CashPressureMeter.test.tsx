import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CashPressureMeter } from "@/components/stable/CashPressureMeter";
import type { CashPressure } from "@/core/stable/cashPressure";

describe("CashPressureMeter", () => {
  it("renders the meter bar with correct width based on meter value", () => {
    const { container } = render(<CashPressureMeter meter={75} label="strained" />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute("style")).toContain("75%");
  });

  it("renders the numeric meter value", () => {
    render(<CashPressureMeter meter={42} label="tight" />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies comfortable color class for comfortable label", () => {
    const { container } = render(<CashPressureMeter meter={10} label="comfortable" />);
    const bar = container.querySelector('[class*="bg-cream"]');
    expect(bar).toBeTruthy();
  });

  it("applies tight color class for tight label", () => {
    const { container } = render(<CashPressureMeter meter={30} label="tight" />);
    const bar = container.querySelector('[class*="bg-amber"]');
    expect(bar).toBeTruthy();
  });

  it("applies strained color class for strained label", () => {
    const { container } = render(<CashPressureMeter meter={60} label="strained" />);
    const bar = container.querySelector('[class*="bg-orange"]');
    expect(bar).toBeTruthy();
  });

  it("applies desperate color class for desperate label", () => {
    const { container } = render(<CashPressureMeter meter={90} label="desperate" />);
    const bar = container.querySelector('[class*="bg-red"]');
    expect(bar).toBeTruthy();
  });
});
