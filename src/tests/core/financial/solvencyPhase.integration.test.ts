import { describe, it, expect } from "vitest";
import { solvencyPhase } from "@/core/time/phases/solvency";
import { SOLVENCY_THRESHOLDS } from "@/core/financial/solvency";
import type { PipelineContext } from "@/core/time/pipeline";
import type { AnyImpact, CashImpact } from "@/core/resolver/impacts/index";

/**
 * Integration tests for the solvencyPhase — verifies day-over-day escalation
 * from healthy → warning → forced_sale → insolvent, and that audit entries
 * accumulate correctly.
 */

function makeContext(overrides: {
  cash: number;
  consecutiveDaysInDebt?: number;
  solvencyTier?: PipelineContext["state"]["solvencyTier"];
  day?: number;
  horses?: Record<string, unknown>;
  auditLog?: PipelineContext["state"]["solvencyAuditLog"];
  runEnded?: boolean;
  runEndSnapshot?: PipelineContext["state"]["runEndSnapshot"];
}): PipelineContext {
  const state = {
    cash: overrides.cash,
    consecutiveDaysInDebt: overrides.consecutiveDaysInDebt ?? 0,
    solvencyTier: overrides.solvencyTier ?? "healthy",
    solvencyAuditLog: overrides.auditLog ?? [],
    horses: overrides.horses ?? {},
    runEnded: overrides.runEnded ?? false,
    runEndSnapshot: overrides.runEndSnapshot,
    reputation: { tier: "journeyman" },
  } as unknown as PipelineContext["state"];

  return {
    previousDay: (overrides.day ?? 1) - 1,
    newDay: overrides.day ?? 1,
    state,
    logs: [],
    dailyRng: (() => Math.random()) as unknown as PipelineContext["dailyRng"],
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(),
    raceMap: new Map(),
    stableMap: new Map(),
    jockeyMap: new Map(),
  };
}

function applyCashImpacts(cash: number, impacts: AnyImpact[]): number {
  let next = cash;
  for (const imp of impacts) {
    if (imp.type === "cash_change") {
      next += (imp as CashImpact).amount;
    }
  }
  return next;
}

describe("solvencyPhase integration — day-by-day escalation", () => {
  it("transitions healthy → warning on first negative day and emits audit entry", () => {
    const ctx = makeContext({ cash: -5_000, day: 1 });
    const result = solvencyPhase.execute(ctx);

    expect(result.state.solvencyTier).toBe("warning");
    expect(result.state.consecutiveDaysInDebt).toBe(1);
    expect(result.state.solvencyAuditLog?.some((e) => e.kind === "escalation")).toBe(true);
    expect(result.state.solvencyAuditLog?.some((e) => e.kind === "interest")).toBe(true);
  });

  it("accrues interest daily while in warning without escalating early", () => {
    let cash = -30_000; // below forcedSaleCash so days will count
    let days = 0;
    let audit: PipelineContext["state"]["solvencyAuditLog"] = [];
    let tier: PipelineContext["state"]["solvencyTier"] = "healthy";

    // Run through the grace period minus one day.
    for (let d = 1; d < SOLVENCY_THRESHOLDS.forcedSaleDays; d++) {
      const ctx = makeContext({
        cash,
        consecutiveDaysInDebt: days,
        solvencyTier: tier,
        auditLog: audit,
        day: d,
      });
      const result = solvencyPhase.execute(ctx);
      cash = applyCashImpacts(cash, result.impacts);
      days = result.state.consecutiveDaysInDebt ?? 0;
      audit = result.state.solvencyAuditLog;
      tier = result.state.solvencyTier;
    }

    expect(tier).toBe("warning");
    expect(days).toBe(SOLVENCY_THRESHOLDS.forcedSaleDays - 1);
    expect(cash).toBeLessThan(-30_000); // interest accrued
  });

  it("escalates warning → forced_sale on day N of debt below threshold and seizes a horse", () => {
    const baseStats = { speed: 70, stamina: 70, acceleration: 70, temperament: 70 };
    const horses = {
      cheap: { id: "cheap", name: "Cheap Chuck", age: 5, stats: baseStats, ratings: { current: 60 } },
      valuable: {
        id: "valuable",
        name: "Star Runner",
        age: 5,
        stats: { speed: 110, stamina: 110, acceleration: 110, temperament: 110 },
        ratings: { current: 110 },
      },
    };
    const ctx = makeContext({
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 1_000,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays - 1,
      solvencyTier: "warning",
      horses,
      day: 10,
    });
    const result = solvencyPhase.execute(ctx);

    expect(result.state.solvencyTier).toBe("forced_sale");
    const transfer = result.impacts.find((i) => i.type === "horse_transfer");
    expect(transfer).toBeDefined();
    const seizure = result.state.solvencyAuditLog?.find((e) => e.kind === "seizure");
    expect(seizure).toBeDefined();
    expect(seizure?.delta).toBeGreaterThanOrEqual(0);
  });

  it("declares insolvency once cash breaches the floor and captures snapshot", () => {
    const ctx = makeContext({
      cash: SOLVENCY_THRESHOLDS.insolventCash - 500,
      consecutiveDaysInDebt: 20,
      solvencyTier: "forced_sale",
      day: 25,
      horses: {
        h: {
          id: "h",
          name: "Last Runner",
          age: 4,
          ratings: { current: 80 },
          raceHistory: [{ purseEarned: 12_000 }, { purseEarned: 3_000 }],
        },
      },
    });
    const result = solvencyPhase.execute(ctx);

    expect(result.state.solvencyTier).toBe("insolvent");
    expect(result.state.runEnded).toBe(true);
    expect(result.state.runEndSnapshot).toBeDefined();
    expect(result.state.runEndSnapshot?.lifetimeEarnings).toBe(15_000);
    expect(result.state.runEndSnapshot?.causeOfDeath).toContain("insolvency");
  });

  it("no-ops after runEnded is true", () => {
    const ctx = makeContext({
      cash: -200_000,
      consecutiveDaysInDebt: 30,
      runEnded: true,
      day: 40,
    });
    const result = solvencyPhase.execute(ctx);
    expect(result.impacts).toHaveLength(0);
    expect(result.state.solvencyAuditLog ?? []).toHaveLength(0);
  });

  it("records a recovered audit entry when cash climbs back above zero", () => {
    const ctx = makeContext({
      cash: 500,
      consecutiveDaysInDebt: 3,
      solvencyTier: "warning",
      day: 8,
    });
    const result = solvencyPhase.execute(ctx);

    expect(result.state.solvencyTier).toBe("healthy");
    expect(result.state.consecutiveDaysInDebt).toBe(0);
    expect(result.state.solvencyAuditLog?.some((e) => e.kind === "recovered")).toBe(true);
  });

  it("emits a proactive alert 2 days before forced sale", () => {
    const ctx = makeContext({
      cash: SOLVENCY_THRESHOLDS.forcedSaleCash - 5_000,
      consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays - 3,
      solvencyTier: "warning",
      day: 5,
    });
    const result = solvencyPhase.execute(ctx);

    const inbox = result.impacts.filter((i) => i.type === "inbox_message");
    expect(
      inbox.some(
        (i) =>
          (i as { message?: { title?: string } }).message?.title ===
          "Forced sale imminent",
      ),
    ).toBe(true);
  });
});
