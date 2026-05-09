import type { Horse, Stable } from "./types";
import type { Rng } from "@/game/rng";

/**
 * AI Training - NPC stables train their horses
 * Called during advanceDay()
 */
export function runNpcTraining(
  stables: Stable[],
  horses: Horse[],
  currentDay: number,
  rng: Rng,
): Horse[] {
  const updatedHorses = [...horses];
  const horseToIndex = new Map(updatedHorses.map((h, i) => [h.id, i]));

  for (const stable of stables) {
    // Training budget and slots vary by tier
    const trainingSlots = stable.tier === "elite" ? 8 : stable.tier === "mid" ? 5 : 3;
    let slotsUsed = 0;

    for (const horseId of stable.horses) {
      if (slotsUsed >= trainingSlots) break;

      const horseIndex = horseToIndex.get(horseId);
      if (horseIndex === undefined) continue;

      const horse = updatedHorses[horseIndex];

      // Skip if horse has been racing recently or low energy
      if (horse.energy < 40) continue;

      // Elite stables train more intelligently
      if (stable.tier === "elite") {
        // Focus on stats below potential
        const stats = horse.stats;
        const gaps = {
          speed: horse.potential - stats.speed,
          stamina: horse.potential - stats.stamina,
          acceleration: horse.potential - stats.acceleration,
          consistency: horse.potential - stats.consistency,
        };

        // Train the biggest gap
        const toTrain = Object.entries(gaps)
          .filter(([_, gap]) => gap > 0)
          .sort((a, b) => b[1] - a[1])[0];

        if (toTrain && toTrain[1] > 0) {
          const stat = toTrain[0] as keyof typeof stats;
          const gain = rng.next() < 0.65 ? 1 : 0;
          if (gain > 0) {
            updatedHorses[horseIndex] = {
              ...horse,
              stats: {
                ...stats,
                [stat]: Math.min(horse.potential, stats[stat] + gain),
              },
              energy: Math.max(0, horse.energy - 18),
            };
          }
        }
      } else {
        // Lower tiers train more randomly
        if (rng.next() < 0.4) {
          const stat = rng.pick(["speed", "stamina", "acceleration"]) as keyof typeof horse.stats;
          updatedHorses[horseIndex] = {
            ...horse,
            stats: {
              ...horse.stats,
              [stat]: Math.min(horse.potential, horse.stats[stat] + 1),
            },
            energy: Math.max(0, horse.energy - 15),
          };
        }
      }

      slotsUsed++;
    }
  }

  return updatedHorses;
}
