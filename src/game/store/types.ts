import type { StateCreator } from "zustand";
import type { CoreState } from "@/game/state/coreState";
import type { RacingSlice } from "./slices/racingSlice";
import type { MarketSlice } from "./slices/marketSlice";
import type { BreedingSlice } from "./slices/breedingSlice";
import type { SystemsSlice } from "./slices/systemsSlice";
import type { CampaignSlice } from "./slices/campaignSlice";
import type { CoreSlice } from "./slices/coreSlice";

/**
 * Standard action result type for store actions
 */
export type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Options for starting a new game
 */
export interface NewGameOptions {
  region: string;
  stableName: string;
  initialCash?: number;
}

/**
 * Composed store type combining all slices
 */
export type StoreType = CoreState &
  RacingSlice &
  MarketSlice &
  BreedingSlice &
  SystemsSlice &
  CampaignSlice &
  CoreSlice & {
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
