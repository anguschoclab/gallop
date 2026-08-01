/**
 * UpcomingLedgerTable component tests
 *
 * Verifies lot count excludes withdrawn lots.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UpcomingLedgerTable } from "@/components/auction/UpcomingLedgerTable";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => {
    const { to, ...rest } = props;
    return (
      <a href={to as string} {...rest}>
        {children}
      </a>
    );
  },
}));

interface TestSale {
  id: string;
  name: string;
  kind: string;
  day: number;
  lots: Array<{ consignorStableId?: string; withdrawn?: boolean }>;
  resolved: boolean;
  isScheduled?: true;
}

describe("UpcomingLedgerTable lot count", () => {
  afterEach(() => cleanup());

  it("counts all lots when none are withdrawn", () => {
    const sales: TestSale[] = [
      {
        id: "s1",
        name: "Test Sale",
        kind: "yearling",
        day: 10,
        resolved: false,
        lots: [{}, {}, {}, {}],
      },
    ];
    render(<UpcomingLedgerTable sales={sales} currentDay={1} />);
    expect(screen.getByText(/4 LOTS/i)).toBeDefined();
  });

  it("counts 0 when all lots are withdrawn", () => {
    const sales: TestSale[] = [
      {
        id: "s1",
        name: "Test Sale",
        kind: "yearling",
        day: 10,
        resolved: false,
        lots: [{ withdrawn: true }, { withdrawn: true }],
      },
    ];
    render(<UpcomingLedgerTable sales={sales} currentDay={1} />);
    expect(screen.getByText(/0 LOTS/i)).toBeDefined();
  });

  it("excludes withdrawn lots from count", () => {
    const sales: TestSale[] = [
      {
        id: "s1",
        name: "Test Sale",
        kind: "yearling",
        day: 10,
        resolved: false,
        lots: [{}, { withdrawn: true }, {}, { withdrawn: true }, {}],
      },
    ];
    render(<UpcomingLedgerTable sales={sales} currentDay={1} />);
    expect(screen.getByText(/3 LOTS/i)).toBeDefined();
  });

  it("handles empty lots array", () => {
    const sales: TestSale[] = [
      {
        id: "s1",
        name: "Test Sale",
        kind: "yearling",
        day: 10,
        resolved: false,
        lots: [],
      },
    ];
    render(<UpcomingLedgerTable sales={sales} currentDay={1} />);
    expect(screen.getByText(/0 LOTS/i)).toBeDefined();
  });
});
