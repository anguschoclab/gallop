import { describe, it, expect } from "vitest";
import {
  buildFinancialPeriod,
  buildProfitLossReport,
} from "@/core/financial/reportBuilder";
import { createTransaction } from "@/core/transactions/transactionTypes";

describe("financial report builder", () => {
  describe("buildFinancialPeriod", () => {
    it("should correctly aggregate income subcategories", () => {
      const transactions = [
        createTransaction("income", "prize_money", 1000, "1st place", 10, 1000),
        createTransaction("income", "auction_sale", 500, "Sold horse", 12, 1500),
        createTransaction("income", "prize_money", 200, "2nd place", 15, 1700),
      ];

      const period = buildFinancialPeriod(transactions, 1, 20, "Test Period");

      expect(period.income.prizeMoney).toBe(1200);
      expect(period.income.auctionSales).toBe(500);
      expect(period.income.claimingSales).toBe(0);
      expect(period.income.total).toBe(1700);
      expect(period.expenses.total).toBe(0);
      expect(period.netProfit).toBe(1700);
    });

    it("should correctly aggregate expense subcategories", () => {
      const transactions = [
        createTransaction("expense", "upkeep", 100, "Daily upkeep", 10, -100),
        createTransaction("expense", "training", 50, "Training", 12, -150),
        createTransaction("expense", "upkeep", 100, "Daily upkeep", 15, -250),
      ];

      const period = buildFinancialPeriod(transactions, 1, 20, "Test Period", 1000);

      expect(period.expenses.upkeep).toBe(200);
      expect(period.expenses.training).toBe(50);
      expect(period.expenses.entryFees).toBe(0);
      expect(period.expenses.total).toBe(250);
      expect(period.income.total).toBe(0);
      expect(period.netProfit).toBe(-250);
      expect(period.startingCash).toBe(1000);
      expect(period.endingCash).toBe(750); // 1000 - 250
    });

    it("should filter transactions by startDay and endDay", () => {
      const transactions = [
        createTransaction("income", "prize_money", 1000, "1st", 5, 1000), // Before
        createTransaction("income", "prize_money", 500, "1st", 10, 1500), // Inside
        createTransaction("income", "prize_money", 200, "2nd", 15, 1700), // Inside
        createTransaction("income", "prize_money", 100, "3rd", 25, 1800), // After
      ];

      const period = buildFinancialPeriod(transactions, 10, 20, "Test Period");

      expect(period.income.total).toBe(700);
      expect(period.income.prizeMoney).toBe(700);
    });
  });

  describe("buildProfitLossReport", () => {
    it("should correctly span day ranges for current week, month, year, and all-time", () => {
      const currentDay = 400;
      const transactions = [
        createTransaction("income", "prize_money", 10, "1st", 1, 10), // Out of year bounds, day 1 is start of all time
        createTransaction("income", "prize_money", 100, "1st", currentDay - 300, 110), // Inside year
        createTransaction("income", "prize_money", 1000, "1st", currentDay - 20, 1110), // Inside month
        createTransaction("income", "prize_money", 10000, "1st", currentDay - 2, 11110), // Inside week
      ];

      const report = buildProfitLossReport(transactions, currentDay);

      // Week: max(1, 400 - 6) to 400 (394-400)
      expect(report.currentWeek.startDay).toBe(394);
      expect(report.currentWeek.endDay).toBe(400);
      expect(report.currentWeek.income.total).toBe(10000);

      // Month: max(1, 400 - 29) to 400 (371-400)
      expect(report.currentMonth.startDay).toBe(371);
      expect(report.currentMonth.endDay).toBe(400);
      expect(report.currentMonth.income.total).toBe(11000); // week + month

      // Year: max(1, 400 - 364) to 400 (36-400)
      expect(report.currentYear.startDay).toBe(36);
      expect(report.currentYear.endDay).toBe(400);
      expect(report.currentYear.income.total).toBe(11100); // week + month + year

      // All Time: 1 to 400
      expect(report.allTime.startDay).toBe(1);
      expect(report.allTime.endDay).toBe(400);
      expect(report.allTime.income.total).toBe(11110); // all
    });
  });
});
