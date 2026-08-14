import type { Runner } from "./runnerBuilder";

/** Minimum valid barrier draw (barriers are 1-indexed). */
const MIN_BARRIER = 1;
/** Finish time must be strictly positive — a zero or negative time is invalid. */
const MIN_FINISH_TIME = 0;
/** Fallback context label when none is provided. */
const DEFAULT_CONTEXT_LABEL = "validateTieBreakFields";

export interface TieBreakIssue {
  horseId: string;
  field: "finishTime" | "barrier" | "horseId";
  value: unknown;
  reason: string;
}

export function validateTieBreakFields(runners: Runner[]): TieBreakIssue[] {
  const issues: TieBreakIssue[] = [];
  for (const r of runners) {
    if (typeof r.horseId !== "string" || r.horseId.length === 0) {
      issues.push({
        horseId: String(r.horseId),
        field: "horseId",
        value: r.horseId,
        reason: "must be a non-empty string",
      });
    }
    if (!Number.isFinite(r.barrier) || r.barrier < MIN_BARRIER) {
      issues.push({
        horseId: r.horseId,
        field: "barrier",
        value: r.barrier,
        reason: `must be a finite number >= ${MIN_BARRIER}`,
      });
    }
    if (
      r.finishTime !== null &&
      !(Number.isFinite(r.finishTime) && r.finishTime > MIN_FINISH_TIME)
    ) {
      issues.push({
        horseId: r.horseId,
        field: "finishTime",
        value: r.finishTime,
        reason: "must be null or a finite positive number",
      });
    }
  }
  return issues;
}

export function assertTieBreakFields(runners: Runner[], context?: string): void {
  if (!(import.meta.env?.DEV || process.env?.NODE_ENV === "development")) return;
  const issues = validateTieBreakFields(runners);
  if (issues.length > 0) {
    const label = context ? `[${context}]` : `[${DEFAULT_CONTEXT_LABEL}]`;
    console.error(`${label} ${issues.length} tie-break field issue(s):`, issues);
    throw new Error(`${label} tie-break field validation failed: ${issues.length} issue(s)`);
  }
}
