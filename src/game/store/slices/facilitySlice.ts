/**
 * store/slices/facilitySlice.ts - Facility management slice
 *
 * This file provides facility-related state and actions for upgrading and managing
 * player facilities.
 *
 * Dependencies: @/core/facilities (PlayerFacilities), @/lib/formatting (formatCurrency), @/game/uuid (generateUUID), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/core/facilities/facilityDefaults.ts (facility defaults)
 */

import type { PlayerFacilities } from "@/core/facilities";
import { formatCurrency } from "@/core/common/formatting";
import { generateUUID } from "@/core/uuid";
import { facilityUpgradeCost } from "@/core/facilities";
import { canUpgradeFacility } from "@/core/reputation";
import { getReputationTier, formatReputationTier } from "@/core/reputation";
import type { ActionResult } from "../types";
import type { GameStateCreator } from "../types";

export type FacilitySlice = {
  /**
   * Upgrades a specific player facility to the next quality level.
   * Validates sufficient cash and checks if facility is already at max level.
   */
  upgradeFacility: (facilityType: string) => ActionResult;
  /** Sets the collection of player stable facilities */
  setFacilities: (facilities: PlayerFacilities) => void;
};

export const createFacilitySlice: GameStateCreator<FacilitySlice> = (set, get) => ({
  upgradeFacility: (facilityType: string) => {
    const s = get();
    if (!s.facilities) return { ok: false, reason: "Facilities not initialized." };
    const facility = s.facilities[facilityType as keyof PlayerFacilities];
    if (!facility) return { ok: false, reason: "Facility not found." };

    if (facility.level === "elite")
      return { ok: false, reason: "Facility already at maximum level." };

    const repScore = s.reputation?.score ?? 0;
    const repTier = getReputationTier(repScore);
    const gate = canUpgradeFacility(facility.level, repTier);
    if (!gate.allowed) {
      return {
        ok: false,
        reason: `Reputation too low. Upgrade requires ${formatReputationTier(gate.requiredTier)} reputation.`,
      };
    }

    const cost = facilityUpgradeCost(facility.level);
    if (s.cash < cost)
      return {
        ok: false,
        reason: `Insufficient cash. Upgrade costs ${formatCurrency(cost)}.`,
      };

    const levelOrder: import("@/core/facilities").FacilityLevel[] = [
      "basic",
      "standard",
      "premium",
      "elite",
    ];
    const nextLevelIndex = levelOrder.indexOf(facility.level) + 1;
    const nextLevel = levelOrder[nextLevelIndex];

    get().enqueueIntent({
      id: generateUUID(),
      entityId: facilityType,
      source: "player",
      day: s.day,
      priority: 100,
      type: "facility_upgrade",
      facilityId: facilityType,
      nextLevel,
      cost,
    });

    return { ok: true };
  },

  setFacilities: (facilities) => {
    set({ facilities });
  },
});
