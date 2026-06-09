import type { Horse, Jockey } from "@/game/types";

/**
 * Compute the compatibility label between a horse's running style
 * and a jockey's archetype.
 */
export function getCompatibility(
  horse: Horse,
  jockey: Jockey,
): "High" | "Good" | "Neutral" | "Poor" {
  const style = horse.runningStyle;
  const arch = jockey.archetype;

  if (arch === "versatile" || arch === "clinical") return "High";

  // Front-end speed horses (E/EP) pair with front_runner
  if ((style === "E" || style === "EP") && arch === "front_runner") return "High";
  // Closers (S) pair with closer/finisher
  if (style === "S" && (arch === "closer" || arch === "finisher")) return "High";
  if (style === "P" && arch === "closer") return "Good";
  if (style === "P" && arch === "finisher") return "Good";

  // Mismatches
  if ((style === "E" || style === "EP") && arch === "closer") return "Poor";
  if (style === "S" && arch === "front_runner") return "Poor";

  return "Neutral";
}
