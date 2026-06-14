import type { Runner } from "@/core/race/engine/runnerBuilder";

/**
 * Generate jockey feedback based on race performance.
 * @param runner
 * @param position
 * @param ordered
 */
export function generateJockeyFeedback(
  runner: Runner,
  position: number,
  ordered: Runner[],
): string {
  const winner = ordered[0];
  const timeDiff =
    runner.finishTime && winner.finishTime ? runner.finishTime - winner.finishTime : 0;

  if (position === 1) {
    return "Perfect ride! Jockey executed the race plan flawlessly.";
  } else if (position <= 3) {
    if (timeDiff < 0.5) {
      return "Strong finish. Just missed the win but showed great heart.";
    } else {
      return "Good effort. Jockey kept the horse competitive throughout.";
    }
  } else if (timeDiff > 2) {
    return "Difficult race. Horse may have struggled with the pace or traffic.";
  } else {
    return "Mid-pack finish. Jockey managed the race well given the circumstances.";
  }
}
