/**
 * store/types.ts - Store type definitions
 *
 * This file provides type definitions for the Zustand store, including the
 * composed StoreType and ActionResult interface.
 *
 * Dependencies: zustand (StateCreator), @/game/state/coreState (CoreState), @/game/state (NewGameOptions), ./slices/* (all slice types)
 * Related files: store/index.ts (uses these types), all slice files (implement slice types)
 */

import type { CoreState } from "@/platform/game/store/state/coreState";
import type { SystemsState } from "@/platform/game/store/state/systemsState";
import type { NewGameOptions } from "@/platform/game/store/state";
import type { StewardsInquiry } from "@/domains/stewards/model/stewardTypes";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { RacingSlice } from "@/platform/game/store/slices/racingSlice";
import type { MarketSlice } from "@/platform/game/store/slices/marketSlice";
import type { ExchangeSlice } from "@/platform/game/store/slices/exchangeSlice";
import type { PriceAlertSlice } from "@/platform/game/store/slices/priceAlertSlice";
import type { ScoutingSlice } from "@/platform/game/store/slices/scoutingSlice";
import type { AuctionSlice } from "@/platform/game/store/slices/auctionSlice";
import type { PrivateSaleSlice } from "@/platform/game/store/slices/privateSaleSlice";
import type { BreedingSlice } from "@/platform/game/store/slices/breedingSlice";
import type { CampaignSlice } from "@/platform/game/store/slices/campaignSlice";
import type { CoreSlice } from "@/platform/game/store/slices/coreSlice";
import type { JockeySlice } from "@/platform/game/store/slices/jockeySlice";
import type { FacilitySlice } from "@/platform/game/store/slices/facilitySlice";
import type { SettingsSlice } from "@/platform/game/store/slices/settingsSlice";
import type { BreedingProgramSlice } from "@/platform/game/store/slices/breedingProgramSlice";
import type { HorseAdminSlice } from "@/platform/game/store/slices/horseAdminSlice";
import type { AwardSlice } from "@/platform/game/store/slices/awardSlice";
import type { UtilitySlice } from "@/platform/game/store/slices/utilitySlice";
import type { WeatherSlice } from "@/platform/game/store/slices/weatherSlice";
import type { InboxSlice } from "@/platform/game/store/slices/inboxSlice";
import type { StaffSlice } from "@/platform/game/store/slices/staffSlice";
import type { InsuranceSlice } from "@/platform/game/store/slices/insuranceSlice";
import type { TransportSlice } from "@/platform/game/store/slices/transportSlice";
import type { TutorialSlice } from "@/platform/game/store/slices/tutorialSlice";
import type { AutoSyndicateSlice } from "@/platform/game/store/slices/autoSyndicateSlice";

/**
 * Standard action result type for store actions
 * @deprecated Import from @/core/common/result instead.
 */
export type { ActionResult } from "@/shared/common/result";

/**
 * Composed store type combining all slices
 */
export type StoreType = CoreState &
  SystemsState &
  RacingSlice &
  MarketSlice &
  ExchangeSlice &
  PriceAlertSlice &
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
  TransportSlice &
  TutorialSlice &
  AutoSyndicateSlice & {
    storeVersion: number;
    startNewGame: (
      options: NewGameOptions,
      progressCallback?: (stage: number, total: number, name: string) => void,
    ) => Promise<void>;
    addStewardsInquiry: (inquiry: StewardsInquiry) => void;
  };

/**
 * Helper type for creating store slices with full store access
 * Matches Zustand's actual set function signature with persist middleware
 */
export type StoreSet = ((
  partial: StoreType | Partial<StoreType> | ((state: StoreType) => StoreType | Partial<StoreType>),
  replace?: false,
) => void) &
  ((partial: StoreType | ((state: StoreType) => StoreType), replace: true) => void);

export type StoreGet = () => StoreType;

/**
 * Slice creator type that matches Zustand's actual signature with persist middleware
 */
export type SliceCreator<TSlice> = (
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
) => TSlice;

/**
 * Generic slice creator alias used by individual slice files.
 * Loosely typed to avoid forcing every slice to spell out the full StoreType.
 */
export type GameStateCreator<TSlice> = (set: StoreSet, get: StoreGet, api?: unknown) => TSlice;
