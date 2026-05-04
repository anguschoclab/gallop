import type { Horse, Pregnancy, Stable, GameState } from "./types";
import { generateUUID } from "./uuid";
import { canBreed } from "@/core/breeding/eligibility";
import { isStallionAvailable } from "@/core/breeding/stallions";
import { isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { calculateBreedingCompatibility } from "./breedingCompatibility";

const BREEDING_FEE = 2000;
const GESTATION_DAYS = 30;

// Personalities that actively breed each season. Others (aggressive, win-now,
// trader, conservative) skip breeding rounds and focus on racing.
const BREEDING_PERSONALITIES: Stable["personality"][] = ["breeder", "developer", "prestige"];

/**
 * Run autonomous NPC breeding for the current day. If today is the start of
 * a hemisphere's breeding season, every breeder-personality stable in that
 * hemisphere attempts to breed each of its mares to the best stallion it
 * can afford.
 *
 * Returns updated horses, stables (cash deductions / credits), and new
 * pregnancies. Pure: no store mutations.
 */
export function runNpcBreeding(
  state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day">,
  newDay: number
): {
  horses: Horse[];
  npcStables: Stable[];
  newPregnancies: Pregnancy[];
  logs: { day: number; text: string }[];
} {
  const northernStart = isBreedingSeasonStart(newDay, "Northern");
  const southernStart = isBreedingSeasonStart(newDay, "Southern");
  if (!northernStart && !southernStart) {
    return { horses: state.horses, npcStables: state.npcStables, newPregnancies: [], logs: [] };
  }

  const newPregnancies: Pregnancy[] = [];
  const logs: { day: number; text: string }[] = [];
  let horses = [...state.horses];
  let stables = [...state.npcStables];

  for (const stable of stables) {
    if (!BREEDING_PERSONALITIES.includes(stable.personality)) continue;

    // Determine which hemisphere just opened — only breed in that hemisphere.
    const hemisphere = stable.country === undefined ? "Northern" : "Northern"; // simplification
    // Actually: derive hemisphere from each mare individually below, since a
    // stable can technically own horses in both hemispheres. We'll filter
    // mares by whose hemisphere just opened.

    // Find this stable's broodmares of breeding age.
    const stableHorses = horses.filter((h) => h.stableId === stable.id);
    const mares = stableHorses.filter((h) =>
      (h.gender === "mare" || h.gender === "filly") &&
      h.age >= 3 && h.age <= 20 &&
      // Hemisphere just opened
      ((h.hemisphere === "Northern" && northernStart) || (h.hemisphere === "Southern" && southernStart)) &&
      !state.pregnancies.some((p) => !p.resolved && p.damId === h.id)
    );

    for (const mare of mares) {
      // Available stallions in mare's hemisphere; sort by compatibility × inverse fee.
      const stallions = horses
        .filter((h) => h.stud?.atStud)
        .filter((h) => h.hemisphere === mare.hemisphere)
        .filter((h) => isStallionAvailable(h, newDay))
        .filter((h) => h.id !== mare.id);

      if (stallions.length === 0) continue;

      // Score: compatibility × 0.6 + (1 - normalize(fee)) × 0.4. Breeders
      // try to balance quality and affordability.
      let best: Horse | undefined;
      let bestScore = -Infinity;
      const maxFee = Math.max(...stallions.map((s) => s.stud!.standingFee));
      for (const stallion of stallions) {
        const totalCost = BREEDING_FEE + stallion.stud!.standingFee;
        if (stable.cash < totalCost) continue;
        const compatibility = calculateBreedingCompatibility(stallion, mare);
        const feeNorm = stallion.stud!.standingFee / Math.max(1, maxFee);
        const score = compatibility.overallScore * 0.6 + (1 - feeNorm) * 0.4;
        if (score > bestScore) {
          bestScore = score;
          best = stallion;
        }
      }
      if (!best) continue;

      // Validate via canBreed (sanity check — same eligibility checks the
      // player's breed action runs).
      const elig = canBreed(best, mare, newDay, [...state.pregnancies, ...newPregnancies]);
      if (!elig.ok) continue;

      const studFee = best.stud!.standingFee;
      const totalCost = BREEDING_FEE + studFee;
      // Deduct from breeder stable; credit sire's stable; bump book counter.
      stables = stables.map((st) => {
        if (st.id === stable.id) return { ...st, cash: st.cash - totalCost };
        if (best!.stableId && st.id === best!.stableId) return { ...st, cash: st.cash + studFee };
        return st;
      });
      horses = horses.map((h) =>
        h.id === best!.id && h.stud
          ? { ...h, stud: { ...h.stud, seasonBookings: h.stud.seasonBookings + 1 } }
          : h
      );

      const preg: Pregnancy = {
        id: generateUUID(),
        sireId: best.id,
        damId: mare.id,
        sireName: best.name,
        damName: mare.name,
        conceivedDay: newDay,
        dueDay: newDay + GESTATION_DAYS,
        resolved: false,
        liveFoalGuarantee: false,
        reBreedingAttempts: 0,
        refunded: false,
      };
      newPregnancies.push(preg);
      logs.push({
        day: newDay,
        text: `${stable.name}: ${best.name} × ${mare.name} (foal due ${preg.dueDay}).`,
      });
    }
  }

  return { horses, npcStables: stables, newPregnancies, logs };
}
