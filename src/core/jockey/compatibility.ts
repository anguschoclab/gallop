import type { Horse, Jockey } from "@/game/types";

/**
 * Compute the compatibility label between a horse's running style
 * and a jockey's archetype.
 * @param horse
 * @param jockey
 */
export function getCompatibility(
  horse: Horse,
  jockey: Jockey,
): "High" | "Good" | "Neutral" | "Poor" {
  const style = horse.runningStyle;
  const arch = jockey.archetype;
  const traits = jockey.traits ?? [];

  // Base archetype result
  let result: "High" | "Good" | "Neutral" | "Poor" = "Neutral";

  if (arch === "versatile" || arch === "clinical") {
    result = "High";
  } else if ((style === "E" || style === "EP") && arch === "front_runner") {
    result = "High";
  } else if (style === "S" && (arch === "closer" || arch === "finisher")) {
    result = "High";
  } else if (style === "P" && arch === "closer") {
    result = "Good";
  } else if (style === "P" && arch === "finisher") {
    result = "Good";
  } else if ((style === "E" || style === "EP") && arch === "closer") {
    result = "Poor";
  } else if (style === "S" && arch === "front_runner") {
    result = "Poor";
  }

  // Trait-based upgrades (take the better of archetype result and trait upgrade)
  const rank = { Poor: 0, Neutral: 1, Good: 2, High: 3 };
  if (traits.includes("gate_master") && style === "E") result = "High";
  if (traits.includes("closer_instinct") && style === "S") result = "High";
  if (traits.includes("closer_instinct") && style === "P" && rank[result] < rank["Good"])
    result = "Good";
  if (traits.includes("pace_presser") && style === "EP" && rank[result] < rank["Good"])
    result = "Good";

  // Trait-based downgrades (mismatch penalty overrides everything)
  if (traits.includes("closer_instinct") && style === "E") result = "Poor";
  if (traits.includes("pace_presser") && style === "S") result = "Poor";

  return result;
}
