import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = (rel: string) =>
  readFileSync(resolve(import.meta.dirname, "..", "..", rel), "utf-8");

describe("underscore labels removed from UI text", () => {
  it("HorseStatsPanel.tsx: no Core_Specs", () => {
    expect(src("components/horse/HorseStatsPanel.tsx")).not.toContain("Core_Specs");
  });

  it("HorseStatsPanel.tsx: no Perf_Telemetry", () => {
    expect(src("components/horse/HorseStatsPanel.tsx")).not.toContain("Perf_Telemetry");
  });

  it("HorseCardHeader.tsx: no F_{horse.fame}", () => {
    expect(src("components/horse/HorseCardHeader.tsx")).not.toContain("F_{horse.fame}");
  });

  it("HorseStatsRadar.tsx: no OPERATIONAL_SPEC", () => {
    expect(src("components/horse/HorseStatsRadar.tsx")).not.toContain("OPERATIONAL_SPEC");
  });

  it("TransactionLedger.tsx: no SAMPLE_50", () => {
    expect(src("components/financial/TransactionLedger.tsx")).not.toContain("SAMPLE_50");
  });

  it("TransactionLedger.tsx: no D.OY", () => {
    expect(src("components/financial/TransactionLedger.tsx")).not.toContain("D.OY");
  });

  it("TransactionLedger.tsx: no Operational_Description", () => {
    expect(src("components/financial/TransactionLedger.tsx")).not.toContain("Operational_Description");
  });

  it("TransactionLedger.tsx: no Secured_Audit_Log", () => {
    expect(src("components/financial/TransactionLedger.tsx")).not.toContain("Secured_Audit_Log");
  });

  it("TransactionLedger.tsx: no End_Of_Ledger", () => {
    expect(src("components/financial/TransactionLedger.tsx")).not.toContain("End_Of_Ledger");
  });

  it("FinancialSummaryCards.tsx: no Period_Income", () => {
    expect(src("components/financial/FinancialSummaryCards.tsx")).not.toContain("Period_Income");
  });

  it("FinancialSummaryCards.tsx: no Period_Outflow", () => {
    expect(src("components/financial/FinancialSummaryCards.tsx")).not.toContain("Period_Outflow");
  });

  it("FinancialSummaryCards.tsx: no Net_Yield", () => {
    expect(src("components/financial/FinancialSummaryCards.tsx")).not.toContain("Net_Yield");
  });

  it("FinancialChart.tsx: no Fiscal_Flow_Analysis", () => {
    expect(src("components/FinancialChart.tsx")).not.toContain("Fiscal_Flow_Analysis");
  });

  it("FinancialChart.tsx: no REVENUE as Area name", () => {
    const content = src("components/FinancialChart.tsx");
    expect(content).not.toContain('name="REVENUE"');
  });

  it("FinancialChart.tsx: no OUTFLOW as Area name", () => {
    const content = src("components/FinancialChart.tsx");
    expect(content).not.toContain('name="OUTFLOW"');
  });

  it("market.tsx: no Available_Capital", () => {
    expect(src("routes/market.tsx")).not.toContain("Available_Capital");
  });

  it("SaleHeader.tsx: no Available_Capital", () => {
    expect(src("components/auction/SaleHeader.tsx")).not.toContain("Available_Capital");
  });

  it("JockeyCard.tsx: no ACTIVE_ACADEMY", () => {
    expect(src("components/jockey/JockeyCard.tsx")).not.toContain("ACTIVE_ACADEMY");
  });

  it("JockeyCard.tsx: no ACTIVE_PRO", () => {
    expect(src("components/jockey/JockeyCard.tsx")).not.toContain("ACTIVE_PRO");
  });

  it("JockeyCard.tsx: no VIEW_BIO", () => {
    expect(src("components/jockey/JockeyCard.tsx")).not.toContain("VIEW_BIO");
  });

  it("JockeyReportPanel.tsx: no Stable_Intelligence", () => {
    expect(src("components/race/JockeyReportPanel.tsx")).not.toContain("Stable_Intelligence");
  });

  it("ResultOverlay.tsx: no Official_Resolution", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("Official_Resolution");
  });

  it("ResultOverlay.tsx: no Awaiting_Runners", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("Awaiting_Runners");
  });

  it("ResultOverlay.tsx: no DIST_SCALING", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("DIST_SCALING");
  });

  it("ResultOverlay.tsx: no Spd_Mod", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("Spd_Mod");
  });

  it("ResultOverlay.tsx: no Sta_Mul", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("Sta_Mul");
  });

  it("ResultOverlay.tsx: no DISMISS_RECORDS", () => {
    expect(src("components/race/ResultOverlay.tsx")).not.toContain("DISMISS_RECORDS");
  });

  it("LiveExchangeFloor.tsx: no Active_Ring", () => {
    expect(src("components/auction/LiveExchangeFloor.tsx")).not.toContain("Active_Ring");
  });
});
