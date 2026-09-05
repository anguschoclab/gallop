import { describe, expect, it } from "vitest";
import {
  createExpense,
  groupExpensesByCategory,
  filterExpensesByDayRange,
  calculateCategoryTotal,
} from "@/core/expenses";
import type { Expense } from "@/core/expenses";

describe("Expense Types & Utility Functions", () => {
  describe("createExpense", () => {
    it("creates an expense with default non-recurring flag", () => {
      const expense = createExpense("upkeep", 100, "Daily care", 1);

      expect(expense).toMatchObject({
        category: "upkeep",
        amount: 100,
        description: "Daily care",
        day: 1,
        horseId: undefined,
        raceId: undefined,
        recurring: false,
      });
      expect(typeof expense.id).toBe("string");
    });

    it("includes optional properties when provided", () => {
      const expense = createExpense("veterinary", 500, "Checkup", 5, {
        horseId: "horse-1",
        recurring: true,
      });

      expect(expense).toMatchObject({
        category: "veterinary",
        amount: 500,
        description: "Checkup",
        day: 5,
        horseId: "horse-1",
        raceId: undefined,
        recurring: true,
      });
    });
  });

  describe("groupExpensesByCategory", () => {
    it("groups expenses and calculates totals and counts", () => {
      const expenses: Expense[] = [
        createExpense("upkeep", 50, "Upkeep 1", 1),
        createExpense("upkeep", 75, "Upkeep 2", 1),
        createExpense("training", 100, "Training 1", 2),
      ];

      const grouped = groupExpensesByCategory(expenses);

      expect(grouped).toHaveLength(2);
      expect(grouped).toContainEqual({ category: "upkeep", amount: 125, count: 2 });
      expect(grouped).toContainEqual({ category: "training", amount: 100, count: 1 });
    });

    it("returns empty array for empty expenses list", () => {
      expect(groupExpensesByCategory([])).toEqual([]);
    });
  });

  describe("filterExpensesByDayRange", () => {
    it("filters expenses within inclusive day range", () => {
      const expenses = [
        createExpense("upkeep", 10, "Day 1", 1),
        createExpense("upkeep", 10, "Day 5", 5),
        createExpense("upkeep", 10, "Day 10", 10),
        createExpense("upkeep", 10, "Day 15", 15),
      ];

      const filtered = filterExpensesByDayRange(expenses, 5, 10);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.day)).toEqual([5, 10]);
    });
  });

  describe("calculateCategoryTotal", () => {
    it("sums amounts for a specific category", () => {
      const expenses = [
        createExpense("upkeep", 100, "Upkeep 1", 1),
        createExpense("training", 50, "Training 1", 1),
        createExpense("upkeep", 150, "Upkeep 2", 2),
      ];

      const total = calculateCategoryTotal(expenses, "upkeep");
      expect(total).toBe(250);
    });

    it("returns 0 if no expenses match the category", () => {
      const expenses = [createExpense("training", 50, "Training 1", 1)];

      const total = calculateCategoryTotal(expenses, "veterinary");
      expect(total).toBe(0);
    });
  });
});
