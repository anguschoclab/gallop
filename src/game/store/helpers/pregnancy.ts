/**
 * store/helpers/pregnancy.ts - Pregnancy resolution helpers
 *
 * This file provides pure business logic for resolving pregnancies and foaling,
 * including live foals, stillbirths, live foal guarantee retries, and cash adjustments.
 *
 * Dependencies: @/game/types (Horse, Pregnancy, Stable, BlueHenStatus, StudCareer), @/core/horse/horseFactory (resolveFoaling), @/core/race/naming/raceNameGenerator (getRegionalSystem), @/core/stable/stableConfig (PERSONALITY_CONFIG), @/lib/formatting (formatCurrency), @/game/constants (BREEDING_FEE, GESTATION_DAYS, LIVE_FOAL_GUARANTEE_FEE)
 * Related files: store/slices/breedingSlice.ts (uses pregnancy helpers)
 */

/**
 * Pregnancy Resolution Helper Functions
 * Pure business logic for resolving pregnancies and foaling
 */

import type {
  Horse,
  Pregnancy,
  Stable,
  RegionalSystem,
  GameState,
  BlueHenStatus,
  StudCareer,
} from "@/game/types";
import { resolveFoaling } from "@/core/horse/horseFactory";
import { getStableId } from "@/core/horse/ownership";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { formatCurrency } from "@/core/common/formatting";
import { BREEDING_FEE, GESTATION_DAYS, LIVE_FOAL_GUARANTEE_FEE } from "@/constants";
import type { NamingContext } from "@/core/horse/naming/nameGenerator";

/**
 * Helper function to get regional system from country string.
 * Maps country to regional system without requiring a full Track object.
 *
 * @param country - Country name
 * @returns The regional system associated with the country
 */
function getRegionalSystemFromCountry(country: string): RegionalSystem {
  return getRegionalSystem(country);
}

export type PregnancyResult = {
  pregnancies: Pregnancy[];
  foals: Horse[];
  cashAdjustment: number;
  logs: { day: number; text: string }[];
  mareFoalingUpdates: Array<{
    horseId: string;
    lastFoaledDay: number;
    foalsProduced: string[];
    blueHenStatus: BlueHenStatus;
  }>;
  studCareerUpdates: Array<{ horseId: string; studCareer: StudCareer }>;
  usedNames: Set<string>;
};

/**
 * Resolves pregnancies that are due on the current day.
 * Handles live foals, stillbirths, and live foal guarantee retries.
 *
 * This function is pure: it does not mutate the input `horses` array or the
 * input `usedNames` set. It returns descriptor objects for any horse updates
 * so callers can apply them via impacts or direct state replacement.
 *
 * @param currentPregnancies - Current pregnancy records
 * @param horses - All horses in the game (for sire/dam lookup)
 * @param stables - All stables (for naming context)
 * @param usedNames - Set of used names to avoid duplicates
 * @param newDay - Current simulation day
 * @param state
 * @returns Result object with updated pregnancies, new foals, cash adjustments, logs, and horse update descriptors
 */
export function resolvePregnancies(
  currentPregnancies: Pregnancy[],
  horses: Horse[],
  stables: Stable[],
  usedNames: Set<string>,
  newDay: number,
  state?: Pick<GameState, "horses" | "userSettings" | "reservedHorseNames">,
): PregnancyResult {
  const newLogs: { day: number; text: string }[] = [];
  const pregnancies = currentPregnancies.map((p) => ({ ...p }));
  const damsById = new Map(horses.map((h) => [h.id, h]));
  const stableMap = new Map(stables.map((s) => [s.id, s]));
  const existingFoalsBySireId = new Map<string, number>();
  for (const h of horses) {
    const sireId = h.pedigree?.sireId;
    if (sireId) {
      existingFoalsBySireId.set(sireId, (existingFoalsBySireId.get(sireId) ?? 0) + 1);
    }
  }
  const foals: Horse[] = [];
  let cashAdjustment = 0;
  const mareFoalingUpdates: PregnancyResult["mareFoalingUpdates"] = [];
  const studCareerUpdates: PregnancyResult["studCareerUpdates"] = [];
  const nextUsedNames = new Set(usedNames);

  const parentNameBlendingEnabled =
    state?.userSettings?.gameplay?.parentNameBlendingEnabled ?? true;

  for (const p of pregnancies) {
    if (p.resolved) continue;
    if (newDay < p.dueDay) continue;
    const sire = damsById.get(p.sireId);
    const dam = damsById.get(p.damId);

    if (!sire || !dam) {
      newLogs.push({
        day: newDay,
        text: `Warning: Could not find sire or dam for pregnancy ${p.id}. Skipping.`,
      });
      continue;
    }

    // Prepare naming context
    const namingContext: NamingContext = {
      existingNames: nextUsedNames,
      reservedNames: state?.reservedHorseNames,
      currentDay: newDay,
      parentNameBlendingEnabled,
    };

    const damStableId = getStableId(dam);
    if (damStableId) {
      const stable = stableMap.get(damStableId);
      if (stable) {
        const regionalSystem = getRegionalSystemFromCountry(stable.country || "USA");
        namingContext.region = regionalSystem;
        namingContext.namingTheme = PERSONALITY_CONFIG[stable.personality]?.namingTheme;
      }
    }

    const outcome = resolveFoaling(p, sire, dam, namingContext, newDay, state);

    if (outcome.kind === "live") {
      const foal = outcome.foal;
      const previousFoals = dam.foalsProduced ?? [];
      const newFoalsProduced = [...previousFoals, foal.id];
      const previousBlueHen = dam.blueHenStatus ?? {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 0,
        foalsProduced: previousFoals.length,
      };
      const blueHenScore = Math.min(
        Math.min(previousBlueHen.stakesWinnersProduced * 15, 60) +
          previousBlueHen.group1WinnersProduced * 20,
        100,
      );
      const isBlueHen =
        previousBlueHen.stakesWinnersProduced >= 2 || previousBlueHen.group1WinnersProduced >= 1;

      mareFoalingUpdates.push({
        horseId: dam.id,
        lastFoaledDay: newDay,
        foalsProduced: newFoalsProduced,
        blueHenStatus: {
          ...previousBlueHen,
          foalsProduced: newFoalsProduced.length,
          blueHenScore,
          isBlueHen,
        },
      });

      // Compute sire's new lifetime foals count without mutating the input array.
      if (sire.stud) {
        const existingFoalsCount = existingFoalsBySireId.get(sire.id) ?? 0;
        const newFoalsCount = foals.filter((f) => f.pedigree?.sireId === sire.id).length;
        studCareerUpdates.push({
          horseId: sire.id,
          studCareer: {
            ...sire.stud,
            lifetimeFoals: existingFoalsCount + newFoalsCount + 1,
          },
        });
      }

      p.resolved = true;
      p.foalId = foal.id;
      foals.push(foal);
      nextUsedNames.add(foal.name.toLowerCase());

      if (outcome.transmission) {
        foal.healthStatus = "covering_sickness";
        foal.healthStatusDay = newDay;
        newLogs.push({
          day: newDay,
          text: `Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}). Covering sickness detected.`,
        });
      } else {
        newLogs.push({
          day: newDay,
          text: `Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}).`,
        });
      }
    } else {
      // Live Foal Guarantee handling
      const canRefund = p.liveFoalGuarantee && !p.refunded;
      const canRetry = p.liveFoalGuarantee && (p.reBreedingAttempts || 0) < 3;
      if (canRetry) {
        if (canRefund) {
          cashAdjustment += BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE;
          p.refunded = true;
        }
        p.resolved = false;
        p.dueDay = newDay + GESTATION_DAYS;
        p.reBreedingAttempts = (p.reBreedingAttempts || 0) + 1;
        newLogs.push({
          day: newDay,
          text: `Foal ${outcome.type}${canRefund ? ` — Live Foal Guarantee refunded ${formatCurrency(BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE)}.` : "."} Re-breeding ${p.damName} to ${p.sireName}. Attempt ${p.reBreedingAttempts}/3. New due day ${p.dueDay}.`,
        });
      } else {
        p.resolved = true;
        newLogs.push({
          day: newDay,
          text: `Foal ${outcome.type}${p.liveFoalGuarantee ? ". Live Foal Guarantee attempts exhausted." : "."}`,
        });
      }
    }
  }

  return {
    pregnancies,
    foals,
    cashAdjustment,
    logs: newLogs,
    mareFoalingUpdates,
    studCareerUpdates,
    usedNames: nextUsedNames,
  };
}
