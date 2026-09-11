/* eslint-disable react-refresh/only-export-components */
import { createRng, hashStr } from "@/services/common/commonFacade";
import type { Backstory } from "@/services/common/commonFacade";
import { generateUUID } from "@/services/common/commonFacade";

export function makeWizardRng(seed: string) {
  return createRng(hashStr(`wizard_${seed}_${Date.now()}_${generateUUID()}`));
}

export const TOTAL_HORSES = (b: Backstory) => b.horses.reduce((sum, h) => sum + h.count, 0);
export const FACILITY_UPGRADE_COUNT = (b: Backstory) => Object.keys(b.facilityUpgrades).length;
