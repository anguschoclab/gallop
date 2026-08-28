/**
 * cashPressureLog.ts - Dev/test tracing for NPC cash-pressure sale decisions
 *
 * Records how each NPC stable's cash pressure combined with the offer ratio to
 * produce an accept / counter / decline outcome, plus aggregate summary stats.
 *
 * Dependencies: none
 * Related files: src/core/time/phases/privateSaleResolution.ts
 */

export interface CashPressureDecisionTrace {
  day: number;
  stableId: string;
  stableName: string;
  personality: string;
  horseName: string;
  cash: number;
  runwayDays: number;
  pressure: number;
  meter: number;
  pressureLabel: string;
  ask: number;
  offerAmount: number;
  offerRatio: number;
  baseAcceptThreshold: number;
  acceptThreshold: number;
  counterThreshold: number;
  shortfallAmount: number;
  shortfallPercent: number;
  outcome: "accepted" | "countered" | "declined";
  counterAmount?: number;
}

export interface CashPressureSummary {
  total: number;
  accepted: number;
  countered: number;
  declined: number;
  /** Mean cash-pressure meter (0-100) across traced decisions. */
  averageMeter: number;
  /** Mean meter for accepted decisions (0 when none). */
  averageMeterAccepted: number;
  /** Mean counter terms across countered decisions (0 when none). */
  averageCounterTerms: number;
  /** Accepted decisions where the offer sat below the personality's base threshold. */
  lowballAccepts: number;
}

const traces: CashPressureDecisionTrace[] = [];

/** Max traces retained in memory to keep long sessions bounded. */
const MAX_TRACES = 500;

function tracingEnabled(): boolean {
  return import.meta.env?.DEV === true || import.meta.env?.MODE === "test";
}

/**
 * Record a cash-pressure sale decision (no-op in production builds).
 * @param trace
 */
export function recordCashPressureDecision(trace: CashPressureDecisionTrace): void {
  if (!tracingEnabled()) return;
  traces.push(trace);
  if (traces.length > MAX_TRACES) traces.splice(0, traces.length - MAX_TRACES);

  if (import.meta.env?.DEV === true) {
    console.debug(
      `[cash-pressure] ${trace.stableName} (${trace.personality}) ${trace.outcome} ` +
        `${trace.horseName}: offer $${trace.offerAmount.toLocaleString()} = ` +
        `${(trace.offerRatio * 100).toFixed(0)}% of ask $${trace.ask.toLocaleString()} | ` +
        `accept ≥ ${(trace.acceptThreshold * 100).toFixed(0)}% ` +
        `(base ${(trace.baseAcceptThreshold * 100).toFixed(0)}%) | ` +
        `pressure ${trace.meter}/100 (${trace.pressureLabel}, ${Math.round(trace.runwayDays)}d runway)` +
        (trace.counterAmount ? ` | counter $${trace.counterAmount.toLocaleString()}` : ""),
    );
  }
}

/** All retained traces (dev/test only). */
export function getCashPressureTraces(): readonly CashPressureDecisionTrace[] {
  return traces;
}

/** Clear retained traces (used by tests). */
export function clearCashPressureTraces(): void {
  traces.length = 0;
}

/**
 * Aggregate summary stats over the retained traces.
 * @param source
 */
export function summarizeCashPressureTraces(
  source: readonly CashPressureDecisionTrace[] = traces,
): CashPressureSummary {
  const total = source.length;
  const accepted = source.filter((t) => t.outcome === "accepted");
  const countered = source.filter((t) => t.outcome === "countered");
  const declined = source.filter((t) => t.outcome === "declined");
  const mean = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  return {
    total,
    accepted: accepted.length,
    countered: countered.length,
    declined: declined.length,
    averageMeter: mean(source.map((t) => t.meter)),
    averageMeterAccepted: mean(accepted.map((t) => t.meter)),
    averageCounterTerms: mean(countered.map((t) => t.counterAmount ?? 0)),
    lowballAccepts: accepted.filter((t) => t.offerRatio < t.baseAcceptThreshold).length,
  };
}
