// Stewards Inquiry Types - Race day inquiries and disqualifications
import { generateUUID } from "@/core/uuid";
import { nondeterministicRng } from "@/core/common/rng";

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
export type InquiryOutcome =
  | "no_action"
  | "warning"
  | "fine"
  | "suspension"
  | "disqualification"
  | "dq_placed_last";

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
 * Create a new stewards inquiry.
 *
 * @param raceId - Unique identifier for the race
 * @param day - Game day the inquiry occurred
 * @param type - Category of the inquiry
 * @param accusedHorseId - Horse ID of the horse under investigation
 * @param description - Detailed description of the incident
 * @param options - Optional investigation metadata
 * @param options.accusedJockeyId - Optional jockey ID if related to riding
 * @param options.reportingHorseId - Optional horse ID of the reporter
 * @param options.evidence - Optional array of evidence descriptions
 * @returns Complete StewardsInquiry object
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
  } = {},
): StewardsInquiry {
  return {
    id: generateUUID(),
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
 * Randomly generate an inquiry (for atmosphere).
 *
 * @param raceId - Unique identifier for the race
 * @param day - Game day
 * @param horseIds - Array of horse IDs in the race
 * @returns StewardsInquiry or null if no inquiry generated
 */
export function generateRandomInquiry(
  raceId: string,
  day: number,
  horseIds: string[],
): StewardsInquiry | null {
  const rng = nondeterministicRng();

  // 5% chance of an inquiry
  if (rng.next() > 0.05) return null;

  const types: InquiryType[] = ["interference", "improper_riding", "lane_violation"];
  const type = rng.pick(types);
  const accusedHorseId = rng.pick(horseIds);
  const reportingHorseId = rng.pick(horseIds.filter((h) => h !== accusedHorseId));

  const descriptions: Record<InquiryType, string> = {
    interference: "Alleged interference in the stretch",
    improper_riding: "Improper riding tactics reported",
    lane_violation: "Lane violation reported",
    equipment_issue: "Equipment irregularity noted",
    medication_violation: "Medication violation suspected",
    other: "General conduct review",
  };

  return createStewardsInquiry(raceId, day, type, accusedHorseId, descriptions[type], {
    reportingHorseId,
  });
}

/**
 * Resolve an inquiry with an outcome.
 *
 * @param inquiry - The inquiry to resolve
 * @param outcome - The final investigation outcome
 * @param fineAmount - Optional fine amount in dollars
 * @param suspensionDays - Optional number of suspension days
 * @returns Updated StewardsInquiry object
 */
export function resolveInquiry(
  inquiry: StewardsInquiry,
  outcome: InquiryOutcome,
  fineAmount?: number,
  suspensionDays?: number,
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
 * Format inquiry type for display.
 *
 * @param type - Inquiry type to format
 * @returns Human-readable label
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
 * Format inquiry outcome for display.
 *
 * @param outcome - Inquiry outcome to format
 * @returns Human-readable label
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
