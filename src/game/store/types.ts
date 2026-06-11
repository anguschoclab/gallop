/**
 * store/types.ts - Store type definitions
 *
 * This file provides type definitions for the Zustand store, including the
 * composed StoreType and ActionResult interface.
 *
 * Dependencies: zustand (StateCreator), @/game/state/coreState (CoreState), @/game/state (NewGameOptions), ./slices/* (all slice types)
 * Related files: store/index.ts (uses these types), all slice files (implement slice types)
 */

import type { StateCreator } from "zustand";
import type { CoreState } from "@/game/store/state/coreState";
import type { SystemsState } from "@/game/store/state/systemsState";
import type { NewGameOptions } from "@/game/store/state";
import type { RacingSlice } from "./slices/racingSlice";
import type { MarketSlice } from "./slices/marketSlice";
import type { ScoutingSlice } from "./slices/scoutingSlice";
import type { AuctionSlice } from "./slices/auctionSlice";
import type { PrivateSaleSlice } from "./slices/privateSaleSlice";
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
import type { WeatherSlice } from "./slices/weatherSlice";
import type { InboxSlice } from "./slices/inboxSlice";
import type { StaffSlice } from "./slices/staffSlice";
import type { InsuranceSlice } from "./slices/insuranceSlice";
import type { TransportSlice } from "./slices/transportSlice";

/**
 * Standard action result type for store actions
 */
export type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Composed store type combining all slices
 */
export type StoreType = CoreState &
  SystemsState &
  RacingSlice &
  MarketSlice &
  ScoutingSlice &
  AuctionSlice &
  PrivateSaleSlice &
  BreedingSlice &
  CampaignSlice &
  CoreSlice &
  JockeySlice &
  FacilitySlice &
  SettingsSlice &
  BreedingProgramSlice &
  HorseAdminSlice &
  AwardSlice &
  UtilitySlice &
  WeatherSlice &
  InboxSlice &
  StaffSlice &
  InsuranceSlice &
  TransportSlice & {
    startNewGame: (options: NewGameOptions) => Promise<void>;
  };

/**
 * Helper type for creating store slices with full store access
 * Matches Zustand's actual set function signature with persist middleware
 */
export type StoreSet = (
  partial: StoreType | Partial<StoreType> | ((state: StoreType) => StoreType | Partial<StoreType>),
  replace?: boolean,
) => void;

export type StoreGet = () => StoreType;

/**
 * Slice creator type that matches Zustand's actual signature with persist middleware
 */
export type SliceCreator<TSlice> = (
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
) => TSlice;

/**
 * Generic slice creator alias used by individual slice files.
 * Loosely typed to avoid forcing every slice to spell out the full StoreType.
 */
export type GameStateCreator<TSlice> = (set: StoreSet, get: StoreGet, api?: unknown) => TSlice;
