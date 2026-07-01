/**
 * AuctionControls.tsx - Bidding and management controls
 *
 * Handles player bidding actions, custom bid input, and max bid (proxy) state.
 */

import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/common/formatting";
import { Gavel, Pause, Play, FastForward, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { nextBidAmount } from "@/core/auction/runner";
import { AuctionErrorState } from "@/components/auction/AuctionStates";
import { BidInputPanel, type BidInputPanelHandle } from "./BidInputPanel";
import { MaxBidPanel } from "./MaxBidPanel";

interface AuctionControlsProps {
  currentBid: number;
  playerIsLeading: boolean;
  paused: boolean;
  onTogglePause: () => void;
  onBid: (amount?: number) => void;
  onPass: () => void;
  onSkip: () => void;
  playerMaxBid: number | undefined;
  onSetMaxBid: (amount: number | undefined) => void;
  error?: string | null;
  onDismissError?: () => void;
  onRetryBid?: () => void;
  isPlayerConsignment?: boolean;
  bidInputRef?: Ref<BidInputPanelHandle>;
}

export function AuctionControls({
  currentBid,
  playerIsLeading,
  paused,
  onTogglePause,
  onBid,
  onPass,
  onSkip,
  playerMaxBid,
  onSetMaxBid,
  error,
  isPlayerConsignment,
  bidInputRef,
}: AuctionControlsProps) {
  const nextMin = nextBidAmount(currentBid);

  return (
    <div className="flex flex-col gap-4">
      {/* Bid Error Toast (inline) */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-bold text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Main Action Bar */}
      <div className="grid grid-cols-4 gap-3">
        <Button
          size="lg"
          className={cn(
            "col-span-2 h-20 text-xl font-black rounded-2xl transition-all shadow-xl active:scale-95",
            playerIsLeading
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              : "bg-primary hover:bg-primary/90 text-primary-foreground",
          )}
          onClick={() => !playerIsLeading && onBid()}
          disabled={playerIsLeading || isPlayerConsignment}
        >
          <Gavel className="mr-3 h-8 w-8" />
          {playerIsLeading ? "LEADING" : `BID ${formatCurrency(nextMin)}`}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-20 flex-col gap-1 rounded-2xl border-2 hover:bg-muted"
          onClick={onTogglePause}
        >
          {paused ? (
            <>
              <Play className="h-6 w-6" />
              <span className="text-[10px] uppercase font-bold">Resume</span>
            </>
          ) : (
            <>
              <Pause className="h-6 w-6" />
              <span className="text-[10px] uppercase font-bold">Pause</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-20 flex-col gap-1 rounded-2xl border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
          onClick={onPass}
        >
          <X className="h-6 w-6" />
          <span className="text-[10px] uppercase font-bold">Pass</span>
        </Button>
      </div>

      {/* Advanced Bidding */}
      {!isPlayerConsignment && (
        <div className="grid grid-cols-2 gap-4">
          <BidInputPanel
            ref={bidInputRef}
            currentBid={currentBid}
            nextMin={nextMin}
            onBid={onBid}
          />
          <MaxBidPanel
            currentBid={currentBid}
            playerMaxBid={playerMaxBid}
            onSetMaxBid={onSetMaxBid}
          />
        </div>
      )}

      {/* Global Controls */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground h-10 mt-2"
        onClick={onSkip}
      >
        <FastForward className="mr-2 h-4 w-4" />
        Skip to Results
      </Button>
    </div>
  );
}
