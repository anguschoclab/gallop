import type { AuctionSale, AuctionLot, Horse, Stable, AuctionBidRecord } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

export type ChantPhase = "open" | "bidding" | "going_once" | "going_twice" | "sold" | "passed";

export type AuctionTickEvent =
  | { type: "LOT_OPEN"; lotId: string }
  | { type: "BID_RECEIVED"; lotId: string; stableId?: string; amount: number }
  | { type: "BID_WAR"; lotId: string; stableIds: string[] }
  | { type: "GOING_ONCE"; lotId: string; amount: number }
  | { type: "GOING_TWICE"; lotId: string; amount: number }
  | { type: "SOLD"; lotId: string; amount: number; toStableId?: string }
  | { type: "PASSED"; lotId: string; reason: "no_bids" | "reserve_not_met" }
  | { type: "RESERVE_NOT_MET"; lotId: string; amount: number; reserve: number };

export type StepResult = {
  events: AuctionTickEvent[];
  done: boolean;
  currentLotIndex: number;
};

export type LotState = {
  lot: AuctionLot;
  currentBid: number;
  leadingBidder: string | undefined;
  bidHistory: AuctionBidRecord[];
  chant: ChantPhase;
  silentSteps: number;
  consecutiveBidders: string[];
};

export type AuctionRunner = {
  currentLotIndex(): number;
  currentLot():
    | {
        lot: AuctionLot;
        horse: Horse | undefined;
        currentBid: number;
        leadingBidder: string | undefined;
        chant: ChantPhase;
        nextBid: number;
        bidHistory: AuctionBidRecord[];
      }
    | undefined;
  step(playerBid?: number): StepResult;
  runToCompletion(): AuctionTickEvent[];
  finalLots(): AuctionLot[];
  log(): string[];
  finalImpacts(args: { day: number; phase: string }): AnyImpact[];
  setPlayerMaxBid(cap: number | undefined): void;
  skipLot(): void;
  finishSale(): void;
  getFinalState(): AuctionTickEvent[];
};

export type AuctionRunnerOptions = {
  liveMode?: boolean;
  npcAIManager?: NpcAIManager;
  currentDay?: number;
  onAutoRaise?: (amount: number) => boolean;
};

export function nextBidAmount(currentBid: number): number {
  return Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
}
