import { describe, it, expect } from "vitest";
import {
  createTransaction,
  filterTransactionsByType,
  filterTransactionsBySubcategory,
  filterTransactionsByDayRange,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  groupTransactionsBySubcategory,
  formatTransactionType,
  formatTransactionSubcategory,
} from "@/core/transactions/transactionTypes";

describe("transactionTypes", () => {
  const transactions = [
    createTransaction("income", "prize_money", 1000, "Won race", 10, 1000),
    createTransaction("expense", "entry_fee", 100, "Race entry", 5, 900, { horseId: "h1" }),
    createTransaction("expense", "upkeep", 50, "Daily care", 15, 850, { recurring: true }),
    createTransaction("income", "auction_sale", 500, "Sold horse", 20, 1350),
    createTransaction("transfer", "player_deposit", 200, "Bank", 2, 200),
  ];

  it("creates a transaction with all properties", () => {
    const t = createTransaction("expense", "veterinary", 200, "Vet bill", 10, -200, {
      horseId: "h1",
      raceId: "r1",
      recurring: false,
    });
    expect(t.type).toBe("expense");
    expect(t.subcategory).toBe("veterinary");
    expect(t.amount).toBe(200);
    expect(t.description).toBe("Vet bill");
    expect(t.day).toBe(10);
    expect(t.balanceAfter).toBe(-200);
    expect(t.horseId).toBe("h1");
    expect(t.raceId).toBe("r1");
    expect(t.recurring).toBe(false);
    expect(t.id).toBeDefined();
  });

  it("filters by type", () => {
    const income = filterTransactionsByType(transactions, "income");
    expect(income.length).toBe(2);
    expect(income.every((t) => t.type === "income")).toBe(true);
  });

  it("filters by subcategory", () => {
    const prize = filterTransactionsBySubcategory(transactions, "prize_money");
    expect(prize.length).toBe(1);
    expect(prize[0].subcategory).toBe("prize_money");
  });

  it("filters by day range (inclusive)", () => {
    const range = filterTransactionsByDayRange(transactions, 5, 15);
    expect(range.length).toBe(3);
    const days = range.map((t) => t.day);
    expect(days).toContain(5);
    expect(days).toContain(10);
    expect(days).toContain(15);
  });

  it("calculates total income (income type only)", () => {
    expect(calculateTotalIncome(transactions)).toBe(1500); // 1000 + 500
  });

  it("calculates total expenses (expense type only)", () => {
    expect(calculateTotalExpenses(transactions)).toBe(150); // 100 + 50
  });

  it("calculates net cash flow", () => {
    expect(calculateNetCashFlow(transactions)).toBe(1350); // 1500 - 150
  });

  it("groups transactions by subcategory", () => {
    const grouped = groupTransactionsBySubcategory(transactions);
    expect(grouped.get("prize_money")).toEqual({ count: 1, total: 1000 });
    expect(grouped.get("entry_fee")).toEqual({ count: 1, total: 100 });
    expect(grouped.get("upkeep")).toEqual({ count: 1, total: 50 });
  });

  it("formats types and subcategories", () => {
    expect(formatTransactionType("expense")).toBe("Expense");
    expect(formatTransactionSubcategory("prize_money")).toBe("Prize Money");
    expect(formatTransactionSubcategory("upkeep")).toBe("Daily Upkeep");
  });
});
