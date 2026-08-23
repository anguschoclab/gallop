import { INJURY_RECOVERY_CAREER_ENDING } from "@/constants/healthInjuryConstants";
import type { InjurySeverity } from "@/core/health/healthSystem";

/**
 * Formats recovery days for display, replacing the 999 sentinel value
 * with the human-readable "Career-ending" label.
 *
 * @param recoveryDays - The raw recovery days value (may be 999 for career-ending)
 * @param severity - The injury severity level
 * @returns Human-readable recovery time string
 */
export function formatRecoveryDays(recoveryDays: number, severity: InjurySeverity): string {
  if (severity === "career-ending" || recoveryDays >= INJURY_RECOVERY_CAREER_ENDING) {
    return "Career-ending";
  }
  return `${recoveryDays} days`;
}
