// Race Day Tactics Types - Jockey instructions for race strategy

/**
 * Riding style/pacing strategy
 */
export type RidingStyle = "front_runner" | "stalker" | "closer" | "tactical";

/**
 * Early race position preference
 */
export type EarlyPosition = "lead" | "press" | "midpack" | "drop_back";

/**
 * Late race move timing
 */
export type MoveTiming = "early" | "mid" | "late";

/**
 * Jockey instructions for a race
 */
export interface JockeyInstructions {
  horseId: string;
  raceId: string;
  ridingStyle: RidingStyle;
  earlyPosition: EarlyPosition;
  moveTiming: MoveTiming;
  aggressiveness: number; // 0-100 scale
  notes?: string;
}

/**
 * Create default jockey instructions for a horse in a specific race.
 *
 * @param horseId - Unique identifier for the horse
 * @param raceId - Unique identifier for the race
 * @returns Default JockeyInstructions object
 */
export function createDefaultInstructions(horseId: string, raceId: string): JockeyInstructions {
  return {
    horseId,
    raceId,
    ridingStyle: "tactical",
    earlyPosition: "midpack",
    moveTiming: "mid",
    aggressiveness: 50,
  };
}

/**
 * Get a human-readable description for a riding style.
 *
 * @param style - The riding style to describe
 * @returns Short description string
 */
export function getRidingStyleDescription(style: RidingStyle): string {
  const descriptions: Record<RidingStyle, string> = {
    front_runner: "Go to the lead early and control the pace",
    stalker: "Sit just off the leaders, ready to pounce",
    closer: "Come from off the pace, make late run",
    tactical: "Adapt to race flow, flexible strategy",
  };
  return descriptions[style];
}

/**
 * Get a human-readable description for an early race position.
 *
 * @param position - The early position to describe
 * @returns Short description string
 */
export function getEarlyPositionDescription(position: EarlyPosition): string {
  const descriptions: Record<EarlyPosition, string> = {
    lead: "Break sharp and aim for the lead",
    press: "Stay close to the leaders",
    midpack: "Settle in the middle of the pack",
    drop_back: "Drop back early, save energy",
  };
  return descriptions[position];
}

/**
 * Get a human-readable description for move timing.
 *
 * @param timing - The move timing to describe
 * @returns Short description string
 */
export function getMoveTimingDescription(timing: MoveTiming): string {
  const descriptions: Record<MoveTiming, string> = {
    early: "Make move on the far turn",
    mid: "Move in the stretch",
    late: "Make late charge in final furlongs",
  };
  return descriptions[timing];
}

/**
 * Calculate performance bonus based on tactics and horse stats.
 *
 * @param instructions - Jockey instructions for the race
 * @param horseSpeed - Horse's current speed rating
 * @param horseStamina - Horse's current stamina rating
 * @returns Calculated performance bonus (0-5)
 */
export function calculateStyleBonus(
  instructions: JockeyInstructions,
  horseSpeed: number,
  horseStamina: number,
): number {
  let bonus = 0;

  switch (instructions.ridingStyle) {
    case "front_runner":
      // Front runners benefit from high speed
      bonus = (horseSpeed - 50) * 0.1;
      break;
    case "closer":
      // Closers benefit from high stamina
      bonus = (horseStamina - 50) * 0.1;
      break;
    case "stalker":
      // Stalkers need balanced stats
      bonus = ((horseSpeed + horseStamina) / 2 - 50) * 0.08;
      break;
    case "tactical":
      // Tactical is flexible, small bonus for balanced
      bonus = Math.abs(horseSpeed - horseStamina) < 10 ? 2 : 0;
      break;
  }

  return Math.max(0, Math.min(5, bonus)); // Clamp between 0 and 5
}

/**
 * Format numeric aggressiveness level as a descriptive string.
 *
 * @param level - Aggressiveness level (0-100)
 * @returns Human-readable aggressiveness label
 */
export function formatAggressiveness(level: number): string {
  if (level < 30) return "Conservative";
  if (level < 50) return "Moderate";
  if (level < 70) return "Aggressive";
  return "Very Aggressive";
}
