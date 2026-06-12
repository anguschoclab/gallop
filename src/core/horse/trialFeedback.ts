import type { Horse } from "@/game/types";

export function generateRiderFeedback(horse: Horse, distance: number, surface: string): string {
  const preferredDistance = horse.distanceAptitude;
  const preferredSurfaceAptitude =
    horse.surfaceAptitude[surface as "Turf" | "Dirt" | "Synthetic"] ?? 0.95;

  let feedback = "";
  if (preferredSurfaceAptitude < 0.95) {
    feedback += `"${horse.name} struggled to get proper traction on the ${surface} surface, feeling a bit green. `;
  } else {
    feedback += `"${horse.name} moved smoothly over the ${surface} surface. `;
  }

  const distDiff = Math.abs(preferredDistance - distance);
  if (distDiff > 400) {
    if (distance > preferredDistance) {
      feedback += `She ran out of steam in the final furlongs; this distance (${distance}m) is too long for her current stamina. `;
    } else {
      feedback += `She finished with plenty of energy but lacked the early speed; this sprint distance is too sharp for her. `;
    }
  } else {
    feedback += `She settled into a nice rhythm and handled the ${distance}m distance comfortably. `;
  }

  if (horse.stats.acceleration > 75) {
    feedback += `Showed an explosive turn of foot when asked to accelerate."`;
  } else {
    feedback += `Finished with a steady, grinding run."`;
  }
  return feedback;
}
