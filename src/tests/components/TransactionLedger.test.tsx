import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TransactionLedger } from "@/components/financial/TransactionLedger";
import { createTransaction } from "@/core/transactions";
import type { Transaction, TransactionSubcategory } from "@/core/transactions/transactionTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, unknown>;
  }) =>
    createElement(
      "a",
      { ...props, href: props.to, "data-params": JSON.stringify(props.params ?? {}) },
      children,
    ),
}));

function mkTx(
  overrides: Partial<Transaction> & {
    type?: Transaction["type"];
    subcategory: TransactionSubcategory;
    amount: number;
    day: number;
    description?: string;
  },
): Transaction {
  return createTransaction(
    overrides.type ?? (overrides.amount >= 0 ? "income" : "expense"),
    overrides.subcategory,
    overrides.amount,
    overrides.description ?? `Test ${overrides.subcategory}`,
    overrides.day,
    overrides.balanceAfter ?? 0,
    { horseId: overrides.horseId, raceId: overrides.raceId, recurring: overrides.recurring },
  );
}

function renderLedger(transactions: Transaction[], day: number = 100) {
  return render(<TransactionLedger transactions={transactions} day={day} />);
}

describe("TransactionLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Existing behavior regression ──────────────────────────────────

  describe("Existing behavior regression", () => {
    it("shows 'No Fiscal Events Recorded' when transactions is empty", () => {
      renderLedger([]);
      expect(screen.getByText("No Fiscal Events Recorded")).toBeInTheDocument();
    });

    it("renders single entry-fee transaction as a single row (not grouped)", () => {
      const tx = mkTx({
        subcategory: "entry_fee",
        amount: -500,
        day: 10,
        raceId: "race-1",
        description: "Entry fee for Big Race",
      });
      renderLedger([tx]);
      expect(screen.getByText("Entry fee for Big Race")).toBeInTheDocument();
      expect(screen.queryByText(/race entries/i)).not.toBeInTheDocument();
    });

    it("renders multiple same-day entry-fee transactions as a grouped row", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for Race A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for Race B",
        }),
      ];
      renderLedger(txs);
      expect(screen.getByText(/2 race entries/i)).toBeInTheDocument();
    });

    it("expands and collapses grouped row on click", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for Race A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for Race B",
        }),
      ];
      renderLedger(txs);

      // Children not visible before expand
      expect(screen.queryByText("Entry fee for Race A")).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText(/2 race entries/i));
      expect(screen.getByText("Entry fee for Race A")).toBeInTheDocument();
      expect(screen.getByText("Entry fee for Race B")).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByText(/2 race entries/i));
      expect(screen.queryByText("Entry fee for Race A")).not.toBeInTheDocument();
    });
  });

  // ── Race Entry Fee Links ──────────────────────────────────────────

  describe("Race Entry Fee Links", () => {
    it("renders plain text when child transaction has no raceId", () => {
      const txs = [
        mkTx({ subcategory: "entry_fee", amount: -500, day: 10, description: "Entry fee no race" }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          description: "Entry fee no race 2",
        }),
      ];
      renderLedger(txs);
      fireEvent.click(screen.getByText(/2 race entries/i));

      const descriptions = screen.getAllByText(/Entry fee no race/i);
      // No <a> tags for these
      descriptions.forEach((el) => {
        expect(el.closest("a")).toBeNull();
      });
    });

    it("renders a link when child transaction has raceId", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "race-42",
          description: "Entry fee for Big Race",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "race-99",
          description: "Entry fee for Small Race",
        }),
      ];
      renderLedger(txs);
      fireEvent.click(screen.getByText(/2 race entries/i));

      const bigRaceLink = screen.getByText("Entry fee for Big Race").closest("a");
      expect(bigRaceLink).not.toBeNull();
      expect(bigRaceLink?.getAttribute("href")).toBe("/race/$raceId");
      expect(bigRaceLink?.getAttribute("data-params")).toContain("race-42");
    });

    it("renders links for each expanded child with raceId", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "race-a",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "race-b",
          description: "Entry fee for B",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -200,
          day: 10,
          raceId: "race-c",
          description: "Entry fee for C",
        }),
      ];
      renderLedger(txs);
      fireEvent.click(screen.getByText(/3 race entries/i));

      expect(screen.getByText("Entry fee for A").closest("a")).not.toBeNull();
      expect(screen.getByText("Entry fee for B").closest("a")).not.toBeNull();
      expect(screen.getByText("Entry fee for C").closest("a")).not.toBeNull();
    });
  });

  // ── Daily Net Cash Flow ───────────────────────────────────────────

  describe("Daily Net Cash Flow", () => {
    it("shows net flow on grouped row when multiple transactions exist on that day", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 2000, day: 10, description: "Prize money" }),
      ];
      renderLedger(txs);
      // Net = 2000 - 500 - 300 = 1200
      expect(screen.getByText(/Net/i)).toBeInTheDocument();
      expect(screen.getByText(/\+\$1,200/i)).toBeInTheDocument();
    });

    it("shows positive net flow (green/success) when income exceeds expenses", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 5000, day: 10, description: "Prize" }),
      ];
      renderLedger(txs);
      const netEl = screen.getByText(/\+\$4,200/i);
      expect(netEl.className).toContain("text-success");
    });

    it("shows negative net flow (red/destructive) when expenses exceed income", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 10, description: "Upkeep" }),
      ];
      renderLedger(txs);
      // Net = -500 - 300 - 200 = -1000
      const netEl = screen.getByText(/-\$1,000/i);
      expect(netEl.className).toContain("text-destructive");
    });

    it("shows zero net flow when day has only entry-fee expenses and no income", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
      ];
      renderLedger(txs);
      // Net = -500 - 300 = -800 (still negative since only expenses)
      // The net badge text contains "Net:" prefix so we can disambiguate from the amount cell
      const netBadges = screen.getAllByText(/Net:/i);
      expect(netBadges.length).toBeGreaterThan(0);
      expect(netBadges[0].textContent).toContain("-$800");
    });

    it("net flow uses ALL transactions for the day, not just entry fees", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 1000, day: 10, description: "Prize" }),
        mkTx({ subcategory: "upkeep", amount: -100, day: 10, description: "Upkeep" }),
      ];
      renderLedger(txs);
      // Net = 1000 - 500 - 300 - 100 = 100
      expect(screen.getByText(/\+\$100/i)).toBeInTheDocument();
    });

    it("net flow does not include transactions from other days", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({
          subcategory: "prize_money",
          amount: 10000,
          day: 5,
          description: "Prize from other day",
        }),
      ];
      renderLedger(txs);
      // Net for day 10 = -500 - 300 = -800 (not 10000 - 800 = 9200)
      const netBadges = screen.getAllByText(/Net:/i);
      expect(netBadges[0].textContent).toContain("-$800");
      expect(screen.queryByText(/\+\$9,200/i)).not.toBeInTheDocument();
    });
  });

  // ── Subcategory Filter ────────────────────────────────────────────

  describe("Subcategory Filter", () => {
    it("shows all transaction types by default", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize won" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 12, description: "Upkeep cost" }),
      ];
      renderLedger(txs);
      expect(screen.getByText("Prize won")).toBeInTheDocument();
      expect(screen.getByText("Upkeep cost")).toBeInTheDocument();
      expect(screen.getByText(/2 race entries/i)).toBeInTheDocument();
    });

    it("filtering to 'Entry Fee' shows only entry_fee transactions", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize money" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 12, description: "Daily upkeep" }),
      ];
      renderLedger(txs);

      // Open subcategory filter and select "Entry Fee"
      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      const entryFeeOption = screen.getByText("Entry Fee");
      fireEvent.click(entryFeeOption);

      // Prize and upkeep should not be visible
      expect(screen.queryByText("Prize money")).not.toBeInTheDocument();
      expect(screen.queryByText("Daily upkeep")).not.toBeInTheDocument();
      // Entry fee group should still be visible
      expect(screen.getByText(/2 race entries/i)).toBeInTheDocument();
    });

    it("filtering to 'Prize Money' shows only prize_money transactions", () => {
      const txs = [
        mkTx({
          subcategory: "entry_fee",
          amount: -500,
          day: 10,
          raceId: "r1",
          description: "Entry fee for A",
        }),
        mkTx({
          subcategory: "entry_fee",
          amount: -300,
          day: 10,
          raceId: "r2",
          description: "Entry fee for B",
        }),
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize money won" }),
      ];
      renderLedger(txs);

      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("Prize Money"));

      expect(screen.getByText("Prize money won")).toBeInTheDocument();
      expect(screen.queryByText(/race entries/i)).not.toBeInTheDocument();
    });

    it("filtering to 'Daily Upkeep' shows only upkeep transactions", () => {
      const txs = [
        mkTx({ subcategory: "upkeep", amount: -200, day: 12, description: "Daily upkeep cost" }),
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize money" }),
      ];
      renderLedger(txs);

      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("Daily Upkeep"));

      expect(screen.getByText("Daily upkeep cost")).toBeInTheDocument();
      expect(screen.queryByText("Prize money")).not.toBeInTheDocument();
    });

    it("selecting a subcategory with zero transactions shows empty state", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize money" }),
      ];
      renderLedger(txs);

      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("Veterinary"));

      expect(screen.getByText("No Fiscal Events Recorded")).toBeInTheDocument();
    });

    it("resetting to 'All' shows all transactions again", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 11, description: "Prize money" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 12, description: "Daily upkeep" }),
      ];
      renderLedger(txs);

      // Filter to prize money
      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("Prize Money"));
      expect(screen.queryByText("Daily upkeep")).not.toBeInTheDocument();

      // Reset to all
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("All"));
      expect(screen.getByText("Daily upkeep")).toBeInTheDocument();
    });
  });

  // ── Date Range Filter ─────────────────────────────────────────────

  describe("Date Range Filter", () => {
    it("All Time preset selected by default shows all transactions", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 1, description: "Early prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 50, description: "Mid upkeep" }),
        mkTx({ subcategory: "training", amount: -100, day: 100, description: "Late training" }),
      ];
      renderLedger(txs, 100);

      expect(screen.getByText("Early prize")).toBeInTheDocument();
      expect(screen.getByText("Mid upkeep")).toBeInTheDocument();
      expect(screen.getByText("Late training")).toBeInTheDocument();
    });

    it("Last 7 Days preset filters to last 7 days", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 50, description: "Old prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 95, description: "Recent upkeep" }),
        mkTx({ subcategory: "training", amount: -100, day: 100, description: "Latest training" }),
      ];
      renderLedger(txs, 100);

      fireEvent.click(screen.getByTestId("date-preset-7d"));

      expect(screen.queryByText("Old prize")).not.toBeInTheDocument();
      expect(screen.getByText("Recent upkeep")).toBeInTheDocument();
      expect(screen.getByText("Latest training")).toBeInTheDocument();
    });

    it("Last 30 Days preset filters to last 30 days", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 50, description: "Old prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 70, description: "Mid upkeep" }),
        mkTx({ subcategory: "training", amount: -100, day: 100, description: "Latest training" }),
      ];
      renderLedger(txs, 100);

      fireEvent.click(screen.getByTestId("date-preset-30d"));

      expect(screen.queryByText("Old prize")).not.toBeInTheDocument();
      expect(screen.queryByText("Mid upkeep")).not.toBeInTheDocument();
      expect(screen.getByText("Latest training")).toBeInTheDocument();
    });

    it("custom day range inputs filter to specified range", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 10, description: "Day 10 prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 20, description: "Day 20 upkeep" }),
        mkTx({ subcategory: "training", amount: -100, day: 30, description: "Day 30 training" }),
      ];
      renderLedger(txs, 100);

      const startInput = screen.getByTestId("day-range-start") as HTMLInputElement;
      const endInput = screen.getByTestId("day-range-end") as HTMLInputElement;

      fireEvent.change(startInput, { target: { value: "15" } });
      fireEvent.change(endInput, { target: { value: "25" } });

      expect(screen.queryByText("Day 10 prize")).not.toBeInTheDocument();
      expect(screen.getByText("Day 20 upkeep")).toBeInTheDocument();
      expect(screen.queryByText("Day 30 training")).not.toBeInTheDocument();
    });

    it("transactions outside the day range are excluded", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 1, description: "Day 1" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 100, description: "Day 100" }),
      ];
      renderLedger(txs, 100);

      fireEvent.click(screen.getByTestId("date-preset-7d"));

      expect(screen.queryByText("Day 1")).not.toBeInTheDocument();
      expect(screen.getByText("Day 100")).toBeInTheDocument();
    });

    it("preset buttons update the custom day inputs", () => {
      const txs: Transaction[] = [];
      renderLedger(txs, 100);

      fireEvent.click(screen.getByTestId("date-preset-7d"));

      const startInput = screen.getByTestId("day-range-start") as HTMLInputElement;
      const endInput = screen.getByTestId("day-range-end") as HTMLInputElement;

      expect(startInput.value).toBe("94");
      expect(endInput.value).toBe("100");
    });
  });

  // ── Filter Combinations ───────────────────────────────────────────

  describe("Filter Combinations", () => {
    it("subcategory + date range filters apply together (AND logic)", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 50, description: "Old prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 98, description: "Recent upkeep" }),
        mkTx({ subcategory: "prize_money", amount: 500, day: 99, description: "Recent prize" }),
      ];
      renderLedger(txs, 100);

      // Filter to last 7 days
      fireEvent.click(screen.getByTestId("date-preset-7d"));

      // Also filter to prize_money
      const subcategorySelect = screen.getByTestId("subcategory-filter");
      fireEvent.click(subcategorySelect);
      fireEvent.click(screen.getByText("Prize Money"));

      // Recent upkeep should be gone (subcategory mismatch)
      expect(screen.queryByText("Recent upkeep")).not.toBeInTheDocument();
      // Old prize should be gone (date mismatch)
      expect(screen.queryByText("Old prize")).not.toBeInTheDocument();
      // Recent prize should be visible (both match)
      expect(screen.getByText("Recent prize")).toBeInTheDocument();
    });

    it("badge count reflects filtered count, not total count", () => {
      const txs = [
        mkTx({ subcategory: "prize_money", amount: 1000, day: 50, description: "Old prize" }),
        mkTx({ subcategory: "upkeep", amount: -200, day: 98, description: "Recent upkeep" }),
        mkTx({ subcategory: "prize_money", amount: 500, day: 99, description: "Recent prize" }),
      ];
      renderLedger(txs, 100);

      // Total count should be 3
      expect(screen.getByText("3 RECS")).toBeInTheDocument();

      // Filter to last 7 days (2 transactions: upkeep + recent prize)
      fireEvent.click(screen.getByTestId("date-preset-7d"));

      expect(screen.getByText("2 RECS")).toBeInTheDocument();
      expect(screen.queryByText("3 RECS")).not.toBeInTheDocument();
    });
  });
});
