// Stewards Inquiry Types - Race day inquiries and disqualifications

/**
 * Inquiry type categories
 */
export type InquiryType =
  | "interference"
  | "improper_riding"
  | "lane_violation"
  | "equipment_issue"
  | "medication_violation"
  | "other";

/**
 * Inquiry status
 */
export type InquiryStatus = "pending" | "reviewing" | "resolved" | "dismissed";

/**
 * Inquiry outcome
 */
export type InquiryOutcome = "no_action" | "warning" | "fine" | "suspension" | "disqualification" | "dq_placed_last";

/**
 * Stewards inquiry
 */
export interface StewardsInquiry {
  id: string;
  raceId: string;
  day: number;
  type: InquiryType;
  status: InquiryStatus;
  outcome?: InquiryOutcome;
  accusedHorseId: string;
  accusedJockeyId?: string;
  reportingHorseId?: string;
  description: string;
  evidence?: string[];
  fineAmount?: number;
  suspensionDays?: number;
  resolvedDay?: number;
}

/**
 * Create a new stewards inquiry
 */
export function createStewardsInquiry(
  raceId: string,
  day: number,
  type: InquiryType,
  accusedHorseId: string,
  description: string,
  options: {
    accusedJockeyId?: string;
    reportingHorseId?: string;
    evidence?: string[];
  } = {}
): StewardsInquiry {
  return {
    id: crypto.randomUUID(),
    raceId,
    day,
    type,
    status: "pending",
    accusedHorseId,
    accusedJockeyId: options.accusedJockeyId,
    reportingHorseId: options.reportingHorseId,
    description,
    evidence: options.evidence,
  };
}

/**
 * Randomly generate an inquiry (for atmosphere)
 */
export function generateRandomInquiry(
  raceId: string,
  day: number,
  horseIds: string[]
): StewardsInquiry | null {
  // 5% chance of an inquiry
  if (Math.random() > 0.05) return null;

  const types: InquiryType[] = ["interference", "improper_riding", "lane_violation"];
  const type = types[Math.floor(Math.random() * types.length)];
  const accusedHorseId = horseIds[Math.floor(Math.random() * horseIds.length)];
  const reportingHorseId = horseIds.filter((h) => h !== accusedHorseId)[Math.floor(Math.random() * (horseIds.length - 1))];

  const descriptions: Record<InquiryType, string> = {
    interference: "Alleged interference in the stretch",
    improper_riding: "Improper riding tactics reported",
    lane_violation: "Lane violation reported",
    equipment_issue: "Equipment irregularity noted",
    medication_violation: "Medication violation suspected",
    other: "General conduct review",
  };

  return createStewardsInquiry(
    raceId,
    day,
    type,
    accusedHorseId,
    descriptions[type],
    { reportingHorseId }
  );
}

/**
 * Resolve an inquiry with an outcome
 */
export function resolveInquiry(
  inquiry: StewardsInquiry,
  outcome: InquiryOutcome,
  fineAmount?: number,
  suspensionDays?: number
): StewardsInquiry {
  return {
    ...inquiry,
    status: "resolved",
    outcome,
    fineAmount,
    suspensionDays,
  };
}

/**
 * Format inquiry type for display
 */
export function formatInquiryType(type: InquiryType): string {
  const labels: Record<InquiryType, string> = {
    interference: "Interference",
    improper_riding: "Improper Riding",
    lane_violation: "Lane Violation",
    equipment_issue: "Equipment Issue",
    medication_violation: "Medication Violation",
    other: "Other",
  };
  return labels[type];
}

/**
 * Format inquiry outcome for display
 */
export function formatInquiryOutcome(outcome: InquiryOutcome): string {
  const labels: Record<InquiryOutcome, string> = {
    no_action: "No Action",
    warning: "Warning",
    fine: "Fine",
    suspension: "Suspension",
    disqualification: "Disqualification",
    dq_placed_last: "DQ - Placed Last",
  };
  return labels[outcome];
}
