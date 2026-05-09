/**
 * store/helpers/pregnancy.ts - Pregnancy resolution helpers
 *
 * This file provides pure business logic for resolving pregnancies and foaling,
 * including live foals, stillbirths, live foal guarantee retries, and cash adjustments.
 *
 * Dependencies: @/game/types (Horse, Pregnancy, Stable), @/core/horse/horseFactory (resolveFoaling), @/core/race/naming/raceNameGenerator (getRegionalSystem), @/core/stable/stableConfig (PERSONALITY_CONFIG), @/core/breeding/lineage (getFoalsBy), @/lib/formatting (formatCurrency), @/game/constants/gameConstants (BREEDING_FEE, GESTATION_DAYS, LIVE_FOAL_GUARANTEE_FEE)
 * Related files: store/slices/breedingSlice.ts (uses pregnancy helpers)
 */

/**
 * Pregnancy Resolution Helper Functions
 * Pure business logic for resolving pregnancies and foaling
 */

import type { Horse, Pregnancy, Stable } from "@/game/types";
import { resolveFoaling } from "@/core/horse/horseFactory";
import { getRegionalSystem } from "@/core/race/naming/raceNameGenerator";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { getFoalsBy } from "@/core/breeding/lineage";
import { formatCurrency } from "@/lib/formatting";
import {
  BREEDING_FEE,
  GESTATION_DAYS,
  LIVE_FOAL_GUARANTEE_FEE,
} from "@/game/constants/gameConstants";

export type PregnancyResult = {
  pregnancies: Pregnancy[];
  foals: Horse[];
  cashAdjustment: number;
  logs: { day: number; text: string }[];
};

/**
 * Resolves pregnancies that are due on the current day
 * Handles live foals, stillbirths, and live foal guarantee retries
 * @param currentPregnancies - Current pregnancy records
 * @param horses - All horses in the game (for sire/dam lookup)
 * @param newDay - Current simulation day
 * @returns Result object with updated pregnancies, new foals, cash adjustments, and logs
 */
export function resolvePregnancies(
  currentPregnancies: Pregnancy[],
  horses: Horse[],
  stables: Stable[],
  usedNames: Set<string>,
  newDay: number,
): PregnancyResult {
  const newLogs: { day: number; text: string }[] = [];
  const pregnancies = currentPregnancies.map((p) => ({ ...p }));
  const damsById = new Map(horses.map((h) => [h.id, h]));
  const foals: Horse[] = [];
  let cashAdjustment = 0;

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

    // Prepare naming context for NPC foals
    let namingContext = undefined;
    if (dam?.stableId) {
      const stable = stables.find((s) => s.id === dam.stableId);
      if (stable) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const regionalSystem = getRegionalSystem(
          (stable.country || "USA") as any, // getRegionalSystem expects Track type, country is string
        );
        namingContext = {
          region: regionalSystem,
          namingTheme: PERSONALITY_CONFIG[stable.personality]?.namingTheme,
          existingNames: usedNames,
        };
      }
    }

    const outcome = resolveFoaling(p, sire, dam, namingContext, newDay);


    if (outcome.kind === "live") {
      const foal = outcome.foal;
      if (dam) {
        if (!dam.blueHenStatus) {
          dam.blueHenStatus = {
            isBlueHen: false,
            stakesWinnersProduced: 0,
            group1WinnersProduced: 0,
            blueHenScore: 0,
            foalsProduced: dam.foalsProduced?.length ?? 0,
          };
        }
        dam.blueHenStatus.foalsProduced = (dam.foalsProduced?.length ?? 0) + 1;
        const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
        const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
        dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
        if (
          dam.blueHenStatus.stakesWinnersProduced >= 2 ||
          dam.blueHenStatus.group1WinnersProduced >= 1
        ) {
          dam.blueHenStatus.isBlueHen = true;
        }
        if (!dam.foalsProduced) dam.foalsProduced = [];
        dam.foalsProduced.push(foal.id);
        dam.lastFoaledDay = newDay;
      }

      // Update sire's lifetime foals count using lineage helper
      // Clone sire to avoid mutating frozen/read-only objects
      if (sire && sire.stud) {
        const sireIndex = horses.findIndex((h) => h.id === sire.id);
        if (sireIndex !== -1) {
          horses[sireIndex] = {
            ...sire,
            stud: {
              ...sire.stud,
              lifetimeFoals: getFoalsBy({ horses: [...horses, foal] }, sire.id).length,
            },
          };
        }
      }

      p.resolved = true;
      p.foalId = foal.id;
      foals.push(foal);

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

  return { pregnancies, foals, cashAdjustment, logs: newLogs };
}
