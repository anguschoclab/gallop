import type { Horse, Pregnancy, Stable, GameState } from "./types";
import { generateUUID } from "./uuid";
import { canBreed } from "@/core/breeding/eligibility";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { calculateBreedingCompatibility } from "./breedingCompatibility";
import { computeCoiFromSnapshot } from "@/core/breeding/populationGenetics";
import type { Rng } from "./rng";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";

const BREEDING_FEE = 2000;
const GESTATION_DAYS = 30;

// Personalities that actively breed each season. Others skip breeding rounds.
const BREEDING_PERSONALITIES: readonly Stable["personality"][] = [
  "breeder",
  "developer",
  "prestige",
  "specialist",
];

// ----------------------------------------------------------------------------
// Personality-driven breeding strategy
// ----------------------------------------------------------------------------

// Per-personality budget: max share of stable's cash to spend on a single
// stud fee. Breeders splurge; developers hunt value; prestige stables go all-in
// on top stallions; specialists are picky and willing to pay for the right fit.
const SINGLE_FEE_CAP_FRACTION: Record<Stable["personality"], number> = {
  breeder: 0.35,
  developer: 0.2,
  prestige: 0.5,
  specialist: 0.3,
  aggressive: 0,
  conservative: 0,
  "win-now": 0,
  trader: 0,
};

// Mare-quality floor — below this overall ability, the stable doesn't bother
// breeding the mare (would waste a stud fee). Personality-driven.
const MIN_MARE_OVERALL: Record<Stable["personality"], number> = {
  breeder: 50,
  developer: 35,
  prestige: 60,
  specialist: 45,
  aggressive: 0,
  conservative: 0,
  "win-now": 0,
  trader: 0,
};

// Inbreeding tolerance — max COI before the stable refuses the cross. Prestige
// stables tolerate close inbreeding when chasing fashionable lines (Northern
// Dancer × Northern Dancer crosses are common at the top).
const MAX_COI: Record<Stable["personality"], number> = {
  breeder: 0.0625,
  developer: 0.05,
  prestige: 0.1,
  specialist: 0.0625,
  aggressive: 1,
  conservative: 1,
  "win-now": 1,
  trader: 1,
};

function overallRating(h: Horse): number {
  return (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
}

// Personality-specific stallion scoring. Compatibility, fee, stakes record,
// fertility, fame, and leaderboard rankings all weight differently per personality.
function scoreStallion(
  stallion: Horse,
  mare: Horse,
  stable: Stable,
  maxFee: number,
  leaderboards?: Record<string, Leaderboard>,
): number {
  const compat = calculateBreedingCompatibility(stallion, mare).overallScore;
  const stud = stallion.stud!;
  const feeNorm = stud.standingFee / Math.max(1, maxFee);
  const stakesRate =
    stud.lifetimeFoals > 0
      ? (stud.lifetimeStakesFoals + 2 * stud.lifetimeG1Foals) / Math.max(5, stud.lifetimeFoals)
      : 0;
  // Fertility — high-fertility sires preferred (a wasted cover is a wasted year).
  const fertilityBonus = (stallion.fertility ?? 0.85) - 0.7; // 0..0.29
  const fameBonus = stallion.fame / 200;

  // Leaderboard bonuses
  let leaderboardBonus = 0;
  if (leaderboards) {
    const overallRank = leaderboards.overall?.rankings.find((r) => r.stallionId === stallion.id);
    const valueRank = leaderboards.value_sires?.rankings.find((r) => r.stallionId === stallion.id);

    if (overallRank && overallRank.rank <= 10) {
      leaderboardBonus += (11 - overallRank.rank) * 0.02; // Top 10 bonus
    }

    if (valueRank && valueRank.rank <= 5 && stable.personality === "developer") {
      leaderboardBonus += (6 - valueRank.rank) * 0.03; // Value bonus for developers
    }

    // Personality-specific leaderboard preferences
    if (stable.personality === "prestige") {
      const g1Rank = leaderboards.g1_producers?.rankings.find((r) => r.stallionId === stallion.id);
      if (g1Rank && g1Rank.rank <= 5) {
        leaderboardBonus += (6 - g1Rank.rank) * 0.04; // G1 bonus for prestige
      }
    }

    if (stable.personality === "specialist") {
      const specialistRank =
        stable.preferredSurface === "Turf"
          ? leaderboards.turf_specialists?.rankings.find((r) => r.stallionId === stallion.id)
          : leaderboards.dirt_specialists?.rankings.find((r) => r.stallionId === stallion.id);
      if (specialistRank && specialistRank.rank <= 5) {
        leaderboardBonus += (6 - specialistRank.rank) * 0.03;
      }
    }
  }

  switch (stable.personality) {
    case "breeder":
      // Balanced: compatibility, proven record, value, fertility, fame, leaderboard influence.
      return (
        compat * 0.45 +
        stakesRate * 0.25 +
        (1 - feeNorm) * 0.15 +
        fertilityBonus * 0.05 +
        fameBonus * 0.05 +
        leaderboardBonus * 0.05
      );
    case "developer":
      // Value-hunters: heavily weight inverse fee + leaderboard value rankings.
      return (
        compat * 0.3 +
        (1 - feeNorm) * 0.35 +
        stakesRate * 0.15 +
        fertilityBonus * 0.1 +
        leaderboardBonus * 0.1
      );
    case "prestige":
      // Brand-chasers: weight fame, classification, high fee, and G1 leaderboards.
      return (
        compat * 0.25 +
        stakesRate * 0.25 +
        fameBonus * 0.2 +
        feeNorm * 0.1 +
        fertilityBonus * 0.05 +
        leaderboardBonus * 0.15
      );
    case "specialist": {
      // Match stallion's distance aptitude to the stable's preference + specialist leaderboards.
      const stableDist = stable.preferredDistance ?? 1600;
      const stallionDistDiff = Math.abs((stallion.distanceAptitude ?? 1600) - stableDist);
      const distMatch = Math.max(0, 1 - stallionDistDiff / 1000);
      return (
        compat * 0.35 +
        distMatch * 0.25 +
        stakesRate * 0.2 +
        (1 - feeNorm) * 0.1 +
        leaderboardBonus * 0.1
      );
    }
    default:
      return compat + leaderboardBonus * 0.1;
  }
}

/**
 * Run autonomous NPC breeding for the current day. Personality-aware:
 * each stable evaluates mares against its quality floor, picks stallions
 * scored by its strategy, respects its single-fee budget cap, and refuses
 * inbreeding above its tolerance. Now influenced by sire leaderboards.
 */
export function runNpcBreeding(
  state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day" | "sireLeaderboards">,
  newDay: number,
  rng: Rng,
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

    const minMareQuality = MIN_MARE_OVERALL[stable.personality];
    const maxCoi = MAX_COI[stable.personality];
    const feeCapFraction = SINGLE_FEE_CAP_FRACTION[stable.personality];

    // Mares of breeding age in the hemisphere whose season just opened, above
    // the personality's quality floor.
    const stableHorses = horses.filter((h) => h.stableId === stable.id);
    const candidateMares = stableHorses.filter(
      (h) =>
        (h.gender === "mare" || h.gender === "filly") &&
        h.age >= 3 &&
        h.age <= 20 &&
        ((h.hemisphere === "Northern" && northernStart) ||
          (h.hemisphere === "Southern" && southernStart)) &&
        !state.pregnancies.some((p) => !p.resolved && p.damId === h.id) &&
        overallRating(h) >= minMareQuality,
    );

    // Best mares first — the stable's best cash on its best mares.
    candidateMares.sort((a, b) => overallRating(b) - overallRating(a));

    // Track running cash so we don't over-commit within one season.
    let stableCash = stables.find((s) => s.id === stable.id)!.cash;

    for (const mare of candidateMares) {
      const maxFeeForThisMare = stableCash * feeCapFraction;

      const stallions = getAvailableStallions({ horses, day: newDay }, mare.hemisphere)
        .filter((h) => h.id !== mare.id)
        .filter((h) => stableCash >= BREEDING_FEE + h.stud!.standingFee)
        .filter((h) => h.stud!.standingFee <= maxFeeForThisMare);

      if (stallions.length === 0) continue;

      // Inbreeding-tolerance pre-filter — refuse stallions whose pairing
      // would exceed the personality's COI cap.
      const toleratedStallions = stallions.filter((stallion) => {
        const hypotheticalPedigree = {
          sireId: stallion.id,
          damId: mare.id,
          sirePedigree: stallion.pedigree,
          damPedigree: mare.pedigree,
        };
        const coi = computeCoiFromSnapshot(hypotheticalPedigree);
        return coi <= maxCoi;
      });

      const candidates = toleratedStallions.length > 0 ? toleratedStallions : stallions;
      const maxFee = Math.max(...candidates.map((s) => s.stud!.standingFee));

      // Score and pick the best stallion.
      let best: Horse | undefined;
      let bestScore = -Infinity;
      for (const stallion of candidates) {
        const score = scoreStallion(stallion, mare, stable, maxFee, state.sireLeaderboards);
        if (score > bestScore) {
          bestScore = score;
          best = stallion;
        }
      }
      if (!best) continue;

      const elig = canBreed(best, mare, newDay, [...state.pregnancies, ...newPregnancies]);
      if (!elig.ok) continue;

      const studFee = best.stud!.standingFee;
      const totalCost = BREEDING_FEE + studFee;
      stableCash -= totalCost;

      stables = stables.map((st) => {
        if (st.id === stable.id) return { ...st, cash: st.cash - totalCost };
        if (best!.stableId && st.id === best!.stableId) return { ...st, cash: st.cash + studFee };
        return st;
      });
      horses = horses.map((h) =>
        h.id === best!.id && h.stud
          ? { ...h, stud: { ...h.stud, seasonBookings: h.stud.seasonBookings + 1 } }
          : h,
      );

      const preg: Pregnancy = {
        id: generateUUID(rng),
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
