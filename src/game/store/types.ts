/**
 * store/types.ts - Store type definitions
 *
 * This file provides type definitions for the Zustand store, including the
 * composed StoreType, ActionResult, and NewGameOptions interfaces.
 *
 * Dependencies: zustand (StateCreator), @/game/state/coreState (CoreState), ./slices/* (all slice types)
 * Related files: store/index.ts (uses these types), all slice files (implement slice types)
 */

import type { StateCreator } from "zustand";
import type { CoreState } from "@/game/state/coreState";
import type { RacingSlice } from "./slices/racingSlice";
import type { MarketSlice } from "./slices/marketSlice";
import type { BreedingSlice } from "./slices/breedingSlice";
import type { CampaignSlice } from "./slices/campaignSlice";
import type { CoreSlice } from "./slices/coreSlice";
import type { JockeySlice } from "./slices/jockeySlice";
import type { FacilitySlice } from "./slices/facilitySlice";
import type { SettingsSlice } from "./slices/settingsSlice";
import type { BreedingProgramSlice } from "./slices/breedingProgramSlice";
import type { HorseAdminSlice } from "./slices/horseAdminSlice";
import type { AwardSlice } from "./slices/awardSlice";
import type { UtilitySlice } from "./slices/utilitySlice";

/**
 * Standard action result type for store actions
 */
export type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Options for starting a new game
 */
export interface NewGameOptions {
  profile: {
    stableName: string;
    ownerName: string;
    silk: any;
    backstoryId: string;
    founded: number;
  };
  backstory: any;
}

/**
 * Composed store type combining all slices
 */
export type StoreType = CoreState &
  RacingSlice &
  MarketSlice &
  BreedingSlice &
  CampaignSlice &
  CoreSlice &
  JockeySlice &
  FacilitySlice &
  SettingsSlice &
  BreedingProgramSlice &
  HorseAdminSlice &
  AwardSlice &
  UtilitySlice & {
    startNewGame: (options: NewGameOptions) => Promise<void>;
  };

/**
 * Helper type for creating store slices with full store access
 */
export type StoreSet = (
  partial: StoreType | Partial<StoreType> | ((state: StoreType) => StoreType | Partial<StoreType>),
  replace?: boolean,
) => void;

export type StoreGet = () => StoreType;

export type GameStateCreator<TSlice> = StateCreator<
  StoreType,
  [["zustand/persist", unknown]],
  [],
  TSlice
>;
