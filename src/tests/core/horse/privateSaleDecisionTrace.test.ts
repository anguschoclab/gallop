import { describe, it, expect, afterEach } from "vitest";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
import { calculateLotValuation } from "@/core/auction/engine";
import { evaluateHorseAttachment, attachmentAdjustedAsk } from "@/core/horse/attachment";
import {
  computePrivateSaleDecision,
  buildPrivateSaleDecisionTrace,
  formatPrivateSaleDecisionTrace,
} from "@/core/horse/privateSaleDecision";
import {
  ACCEPT_THRESHOLDS,
  COUNTER_THRESHOLDS,
  COUNTER_MULTIPLIERS,
  DECISION_TRACE_LOG_PREFIX,
} from "@/constants/privateSaleConstants";
import { UPKEEP_PER_HORSE } from "@/constants/economicConstants";
import {
  getCashPressureTuning,
  setCashPressureTuningOverrides,
  resetCashPressureTuningOverrides,
} from "@/core/stable/cashPressureTuning";
import type { Horse, Stable } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    ...overrides,
  });

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  createTestStable({
    id: "stable-1",
    name: "Green Acres",
    personality: "aggressive",
    horses: [asHorseId("horse-1")],
    ...overrides,
  });

/** Build a stable whose cash yields an exact runway (in days of upkeep). */
const cashForRunway = (runwayDays: number, horses = 1) => runwayDays * horses * UPKEEP_PER_HORSE;

describe("privateSaleDecisionTrace", () => {
  afterEach(() => resetCashPressureTuningOverrides());

  // Shared inputs: aggressive personality, default test horse.
  // baseAcceptThreshold=0.7, baseCounterThreshold=0.5, baseCounterMultiplier=1.1
  const personality = "aggressive";
  const baseAccept = ACCEPT_THRESHOLDS[personality];
  const baseCounter = COUNTER_THRESHOLDS[personality];
  const baseMultiplier = COUNTER_MULTIPLIERS[personality];
  const maxDiscount = getCashPressureTuning().maxThresholdDiscount;

  const horse = mkHorse();
  const stableBase = mkStable();
  const marketValue = calculateLotValuation(horse, stableBase, "racing_age", [horse]);
  const attachment = evaluateHorseAttachment(horse, stableBase);
  const valuation = attachmentAdjustedAsk(horse, stableBase, marketValue);

  // ── Runway edges: 0%, 25%, 50%, 75%, 100% pressure ───────────────────────
  // Default tuning: comfortDays=120, crisisDays=20, span=100.
  // runway = comfortDays - pressure * span  (linear, exponent=1)
  const tuning = getCashPressureTuning();
  const span = tuning.comfortDays - tuning.crisisDays;
  const edges: Array<{ pct: number; runway: number }> = [
    { pct: 0.0, runway: tuning.comfortDays },
    { pct: 0.25, runway: tuning.comfortDays - 0.25 * span },
    { pct: 0.5, runway: tuning.comfortDays - 0.5 * span },
    { pct: 0.75, runway: tuning.comfortDays - 0.75 * span },
    { pct: 1.0, runway: tuning.crisisDays },
  ];

  describe("trace fields at each pressure edge", () => {
    for (const edge of edges) {
      it(`pressure=${edge.pct * 100}%: runway, pressure, thresholds, label match`, () => {
        const stable = mkStable({ cash: cashForRunway(edge.runway) });
        const trace = buildPrivateSaleDecisionTrace({
          stable,
          horse,
          offer: { amount: Math.round(valuation * 0.6) },
          valuation,
          attachment,
        });

        expect(trace.runwayDays).toBeCloseTo(edge.runway, 5);
        expect(trace.pressure).toBeCloseTo(edge.pct, 5);
        expect(trace.personality).toBe(personality);
        expect(trace.horseName).toBe("Thunder");
        expect(trace.stableName).toBe("Green Acres");
        expect(trace.horseCount).toBe(1);
        expect(trace.dailyUpkeep).toBe(UPKEEP_PER_HORSE);
        expect(trace.valuation).toBe(valuation);

        // Base thresholds are personality constants
        expect(trace.baseAcceptThreshold).toBe(baseAccept);
        expect(trace.baseCounterThreshold).toBe(baseCounter);
        expect(trace.baseCounterMultiplier).toBe(baseMultiplier);

        // Softened thresholds = base * (1 - maxDiscount * pressure)
        expect(trace.softenedAcceptThreshold).toBeCloseTo(
          baseAccept * (1 - maxDiscount * edge.pct),
          5,
        );
        expect(trace.softenedCounterThreshold).toBeCloseTo(
          baseCounter * (1 - maxDiscount * edge.pct),
          5,
        );
        expect(trace.softenedCounterMultiplier).toBeCloseTo(
          baseMultiplier * (1 - maxDiscount * edge.pct),
          5,
        );
      });
    }
  });

  describe("decision outcomes at pressure edges", () => {
    it("0% pressure: offer at 0.6 ratio is countered (0.5 <= 0.6 < 0.7)", () => {
      const stable = mkStable({ cash: cashForRunway(tuning.comfortDays) });
      const result = computePrivateSaleDecision({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      expect(result.decision).toBe("countered");
      expect(result.counterAmount).toBe(Math.round(valuation * baseMultiplier));
    });

    it("100% pressure: same 0.6 ratio offer is accepted (softened accept = 0.525)", () => {
      const stable = mkStable({ cash: cashForRunway(tuning.crisisDays) });
      const result = computePrivateSaleDecision({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      // softened accept = 0.7 * (1 - 0.25) = 0.525; 0.6 >= 0.525 → accepted
      expect(result.decision).toBe("accepted");
    });

    it("counter-softening: offer at 0.45 ratio declined at 0%, countered at 100%", () => {
      const offerAmount = Math.round(valuation * 0.45);

      const comfortable = mkStable({ cash: cashForRunway(tuning.comfortDays) });
      const r0 = computePrivateSaleDecision({
        stable: comfortable,
        horse,
        offer: { amount: offerAmount },
        valuation,
        attachment,
      });
      // 0.45 < 0.5 (counter threshold) → declined
      expect(r0.decision).toBe("declined");

      const desperate = mkStable({ cash: cashForRunway(tuning.crisisDays) });
      const r100 = computePrivateSaleDecision({
        stable: desperate,
        horse,
        offer: { amount: offerAmount },
        valuation,
        attachment,
      });
      // softened counter = 0.5 * 0.75 = 0.375; 0.45 >= 0.375 → countered
      expect(r100.decision).toBe("countered");
      expect(r100.counterAmount).toBeCloseTo(
        Math.round(valuation * baseMultiplier * (1 - maxDiscount)),
        5,
      );
    });

    it("counter amount softens downward as pressure rises", () => {
      const offerAmount = Math.round(valuation * 0.4);
      const counters: number[] = [];
      for (const edge of edges) {
        const stable = mkStable({ cash: cashForRunway(edge.runway) });
        const result = computePrivateSaleDecision({
          stable,
          horse,
          offer: { amount: offerAmount },
          valuation,
          attachment,
        });
        if (result.decision === "countered" && result.counterAmount !== undefined) {
          counters.push(result.counterAmount);
        }
      }
      // Counter amounts should be non-increasing as pressure rises
      for (let i = 1; i < counters.length; i++) {
        expect(counters[i]).toBeLessThanOrEqual(counters[i - 1]);
      }
    });
  });

  describe("formatPrivateSaleDecisionTrace", () => {
    it("produces a [trace]-prefixed single-line summary", () => {
      const stable = mkStable({ cash: cashForRunway(edges[2].runway) });
      const trace = buildPrivateSaleDecisionTrace({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      const text = formatPrivateSaleDecisionTrace(trace);
      expect(text.startsWith(DECISION_TRACE_LOG_PREFIX)).toBe(true);
      expect(text).toContain("Green Acres");
      expect(text).toContain("Thunder");
      expect(text).toContain("aggressive");
      expect(text).toContain("runway=");
      expect(text).toContain("pressure=");
      expect(text).toContain("→ ");
      // No newlines
      expect(text.includes("\n")).toBe(false);
    });

    it("includes counter amount when decision is countered", () => {
      const stable = mkStable({ cash: cashForRunway(tuning.comfortDays) });
      const trace = buildPrivateSaleDecisionTrace({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      expect(trace.decision).toBe("countered");
      const text = formatPrivateSaleDecisionTrace(trace);
      expect(text).toContain("counter=$");
    });

    it("omits counter amount when decision is accepted", () => {
      const stable = mkStable({ cash: cashForRunway(tuning.crisisDays) });
      const trace = buildPrivateSaleDecisionTrace({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      expect(trace.decision).toBe("accepted");
      const text = formatPrivateSaleDecisionTrace(trace);
      expect(text).not.toContain("counter=");
    });
  });

  describe("curve exponent interaction with trace", () => {
    it("pressureCurveExponent=2 lowers trace pressure at mid-runway", () => {
      const stable = mkStable({ cash: cashForRunway(edges[2].runway) });
      const linearTrace = buildPrivateSaleDecisionTrace({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      setCashPressureTuningOverrides({ pressureCurveExponent: 2 });
      const curvedTrace = buildPrivateSaleDecisionTrace({
        stable,
        horse,
        offer: { amount: Math.round(valuation * 0.6) },
        valuation,
        attachment,
      });
      expect(curvedTrace.pressure).toBeLessThan(linearTrace.pressure);
      // Softened thresholds should be higher (less softening) under curved pressure
      expect(curvedTrace.softenedAcceptThreshold).toBeGreaterThan(
        linearTrace.softenedAcceptThreshold,
      );
    });
  });
});
