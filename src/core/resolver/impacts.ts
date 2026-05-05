// Impact type definitions for the impact resolver system
// Impacts are the actual state changes generated from resolved intents

import type { Horse, Race, Jockey, Pregnancy, AuctionLot, ScoutReport, CampaignFlag, HorseCampaign } from "@/game/types";

// Base impact type
export interface Impact {
  id: string;
  intentId: string;
  day: number;
  phase: string;
  logLevel: "always" | "conditional" | "never";
}

// Cash impact
export interface CashImpact extends Impact {
  type: "cash_change";
  entityId: string; // stableId or undefined for player
  amount: number;
  reason: string;
}

// Horse stat impact
export interface HorseStatImpact extends Impact {
  type: "horse_stat_change";
  horseId: string;
  stat: "speed" | "stamina" | "acceleration" | "consistency";
  delta: number;
  reason: string;
}

// Energy impact
export interface EnergyImpact extends Impact {
  type: "energy_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Form impact
export interface FormImpact extends Impact {
  type: "form_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Fame impact
export interface FameImpact extends Impact {
  type: "fame_change";
  horseId: string;
  delta: number;
  reason: string;
}

// Horse creation impact
export interface HorseCreationImpact extends Impact {
  type: "horse_creation";
  horse: Horse;
  reason: string;
}

// Horse transfer impact
export interface HorseTransferImpact extends Impact {
  type: "horse_transfer";
  horseId: string;
  fromStableId?: string;
  toStableId?: string;
  price: number;
  reason: string;
}

// Horse deletion impact (for filler horses that should be removed)
export interface HorseDeletionImpact extends Impact {
  type: "horse_deletion";
  horseId: string;
  reason: string;
}

// Race entry impact
export interface RaceEntryImpact extends Impact {
  type: "race_entry";
  raceId: string;
  horseId: string;
  jockeyId?: string;
  weight?: number;
  entryFee: number;
  ridingFee?: number;
  reason: string;
}

// Race withdrawal impact
export interface RaceWithdrawalImpact extends Impact {
  type: "race_withdrawal";
  raceId: string;
  horseId: string;
  refundAmount: number;
  reason: string;
}

// Race result impact
export interface RaceResultImpact extends Impact {
  type: "race_result";
  raceId: string;
  results: { horseId: string; position: number; time: number }[];
  reason: string;
}

// Pregnancy creation impact
export interface PregnancyCreationImpact extends Impact {
  type: "pregnancy_creation";
  pregnancy: Pregnancy;
  reason: string;
}

// Pregnancy update impact
export interface PregnancyUpdateImpact extends Impact {
  type: "pregnancy_update";
  pregnancyId: string;
  updates: Partial<Pregnancy>;
  reason: string;
}

// Pregnancy deletion impact
export interface PregnancyDeletionImpact extends Impact {
  type: "pregnancy_deletion";
  pregnancyId: string;
  reason: string;
}

// Stud career impact
export interface StudCareerImpact extends Impact {
  type: "stud_career";
  horseId: string;
  studCareer: {
    atStud: boolean;
    standingFee: number;
    bookSize: number;
    seasonBookings: number;
    lifetimeFoals: number;
    lifetimeStakesFoals: number;
    lifetimeG1Foals: number;
    retiredOnDay: number;
  };
  reason: string;
}

// Jockey contract impact
export interface JockeyContractImpact extends Impact {
  type: "jockey_contract";
  jockeyId: string;
  stableId?: string;
  contractUntil?: number;
  reason: string;
}

// Jockey assignment impact
export interface JockeyAssignmentImpact extends Impact {
  type: "jockey_assignment";
  raceId: string;
  horseId: string;
  jockeyId: string;
  reason: string;
}

// Scout report impact
export interface ScoutReportImpact extends Impact {
  type: "scout_report";
  report: ScoutReport;
  reason: string;
}

// Consignment impact
export interface ConsignmentImpact extends Impact {
  type: "consignment";
  horseId: string;
  saleId: string;
  reservePrice: number;
  reason: string;
}

// Consignment withdrawal impact
export interface ConsignmentWithdrawalImpact extends Impact {
  type: "consignment_withdrawal";
  horseId: string;
  saleId: string;
  reason: string;
}

// Auction bid impact
export interface AuctionBidImpact extends Impact {
  type: "auction_bid";
  saleId: string;
  lotId: string;
  amount: number;
  bidderStableId?: string;
  reason: string;
}

// Auction resolution impact
export interface AuctionResolutionImpact extends Impact {
  type: "auction_resolution";
  saleId: string;
  lotId: string;
  hammerPrice?: number;
  soldToStableId?: string;
  passed: boolean;
  reason: string;
}

// Gelding impact
export interface GeldingImpact extends Impact {
  type: "gelding";
  horseId: string;
  reason: string;
}

// Rename impact
export interface RenameImpact extends Impact {
  type: "rename";
  horseId: string;
  newName: string;
  reason: string;
}

// Campaign slot impact
export interface CampaignSlotImpact extends Impact {
  type: "campaign_slot";
  horseId: string;
  slotIndex: number;
  slot: Partial<{
    dayTarget: number;
    dayWindow: number;
    raceId: string;
    raceKey: string;
    role: "target" | "prep" | "comeback";
    constraintDistance?: number;
    constraintSurface?: "Turf" | "Dirt" | "Synthetic";
    constraintGradeMin?: "G1" | "G2" | "G3" | "Stakes" | "Allowance";
    notes?: string;
    status: "planned" | "entered" | "completed" | "skipped" | "cancelled";
  }>;
  reason: string;
}

// Campaign flag impact
export interface CampaignFlagImpact extends Impact {
  type: "campaign_flag";
  horseId: string;
  flag: CampaignFlag;
  reason: string;
}

// Campaign creation impact
export interface CampaignCreationImpact extends Impact {
  type: "campaign_creation";
  campaign: HorseCampaign;
  reason: string;
}

// Campaign deletion impact
export interface CampaignDeletionImpact extends Impact {
  type: "campaign_deletion";
  horseId: string;
  reason: string;
}

// Auto-manage toggle impact
export interface AutoManageToggleImpact extends Impact {
  type: "auto_manage_toggle";
  horseId: string;
  autoManaged: boolean;
  reason: string;
}

// Aging impact
export interface AgingImpact extends Impact {
  type: "aging";
  horseId: string;
  previousAge: number;
  newAge: number;
  reason: string;
}

// Race history impact
export interface RaceHistoryImpact extends Impact {
  type: "race_history";
  horseId: string;
  raceHistoryEntry: {
    raceId: string;
    raceName: string;
    position: number;
    day: number;
    beyer?: number;
    grade?: "G1" | "G2" | "G3";
    distance?: number;
    surface?: string;
    purse?: number;
    fieldSize?: number;
    raceClass?: import("@/game/types").RaceClass;
    barrier?: number;
    lane?: number;
  };
  reason: string;
}

// Claiming impact
export interface ClaimingImpact extends Impact {
  type: "claiming";
  raceId: string;
  horseId: string;
  fromStableId?: string;
  toStableId?: string;
  claimingPrice: number;
  reason: string;
}

// Blue hen status impact
export interface BlueHenImpact extends Impact {
  type: "blue hen_status";
  horseId: string;
  blueHenStatus: {
    isBlueHen: boolean;
    stakesWinnersProduced: number;
    group1WinnersProduced: number;
    blueHenScore: number;
    foalsProduced?: number;
  };
  reason: string;
}

// Jockey stats impact
export interface JockeyStatsImpact extends Impact {
  type: "jockey_stats";
  jockeyId: string;
  careerStarts: number;
  careerWins: number;
  fame: number;
  reason: string;
}

// Log impact
export interface LogImpact extends Impact {
  type: "log";
  text: string;
  reason: string;
}

// Pace sample impact
export interface PaceSampleImpact extends Impact {
  type: "pace_sample";
  distance: number;
  time: number;
  reason: string;
}

// Union type for all impacts
export type AnyImpact =
  | CashImpact
  | HorseStatImpact
  | EnergyImpact
  | FormImpact
  | FameImpact
  | HorseCreationImpact
  | HorseTransferImpact
  | HorseDeletionImpact
  | RaceEntryImpact
  | RaceWithdrawalImpact
  | RaceResultImpact
  | PregnancyCreationImpact
  | PregnancyUpdateImpact
  | PregnancyDeletionImpact
  | StudCareerImpact
  | JockeyContractImpact
  | JockeyAssignmentImpact
  | ScoutReportImpact
  | ConsignmentImpact
  | ConsignmentWithdrawalImpact
  | AuctionBidImpact
  | AuctionResolutionImpact
  | GeldingImpact
  | RenameImpact
  | CampaignSlotImpact
  | CampaignFlagImpact
  | CampaignCreationImpact
  | CampaignDeletionImpact
  | AutoManageToggleImpact
  | AgingImpact
  | RaceHistoryImpact
  | ClaimingImpact
  | BlueHenImpact
  | JockeyStatsImpact
  | LogImpact
  | PaceSampleImpact;
