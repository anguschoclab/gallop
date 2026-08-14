import type { Runner } from "./runnerBuilder";

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
    if (!Number.isFinite(r.barrier) || r.barrier < 1) {
      issues.push({
        horseId: r.horseId,
        field: "barrier",
        value: r.barrier,
        reason: "must be a finite number >= 1",
      });
    }
    if (r.finishTime !== null && !(Number.isFinite(r.finishTime) && r.finishTime > 0)) {
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
    const label = context ? `[${context}]` : "[validateTieBreakFields]";
    console.error(`${label} ${issues.length} tie-break field issue(s):`, issues);
    throw new Error(`${label} tie-break field validation failed: ${issues.length} issue(s)`);
  }
}
