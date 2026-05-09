import type { PlayerFacilities } from "@/core/facilities";
import { formatCurrency } from "@/lib/formatting";
import { generateUUID } from "@/game/uuid";
import type { ActionResult } from "../types";
import type { GameStateCreator } from "../types";

export type FacilitySlice = {
  upgradeFacility: (facilityType: string) => ActionResult;
  setFacilities: (facilities: PlayerFacilities) => void;
};

export const createFacilitySlice: GameStateCreator<FacilitySlice> = (set, get) => ({
  upgradeFacility: (facilityType: string) => {
    const s = get();
    if (!s.facilities) return { ok: false, reason: "Facilities not initialized." };
    const facility = s.facilities[facilityType as keyof PlayerFacilities];
    if (!facility) return { ok: false, reason: "Facility not found." };
    const nextLevel = facility.level + 1;
    const cost = Math.floor(5000 * Math.pow(1.5, nextLevel - 1));
    if (s.cash < cost)
      return {
        ok: false,
        reason: `Insufficient cash. Upgrade costs ${formatCurrency(cost)}.`,
      };

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
