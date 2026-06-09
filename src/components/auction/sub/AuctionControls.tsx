/**
 * AuctionControls.tsx - Bidding and management controls
 *
 * Handles player bidding actions, custom bid input, and max bid (proxy) state.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatting";
import { Gavel, Pause, Play, FastForward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextBidAmount } from "@/game/auction/runner";

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
  isPlayerConsignment?: boolean;
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
}: AuctionControlsProps) {
  const [customBid, setCustomBid] = useState("");
  const [maxBidInput, setMaxBidInput] = useState("");
  const nextMin = nextBidAmount(currentBid);

  const handleCustomBid = () => {
    const val = parseInt(customBid);
    if (isNaN(val) || val <= currentBid) return;
    onBid(val);
    setCustomBid("");
  };

  const handleMaxBid = () => {
    const val = parseInt(maxBidInput);
    if (isNaN(val) || val <= currentBid) {
      onSetMaxBid(undefined);
    } else {
      onSetMaxBid(val);
    }
    setMaxBidInput("");
  };

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
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
              Custom Bid
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`min ${formatCurrency(nextMin)}`}
                className="rounded-xl h-12 bg-muted/30 border-muted"
                value={customBid}
                onChange={(e) => setCustomBid(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomBid()}
              />
              <Button
                variant="secondary"
                className="h-12 px-4 rounded-xl font-bold"
                onClick={handleCustomBid}
              >
                GO
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-muted-foreground ml-1 flex justify-between">
              <span>Max Bid (Auto)</span>
              {playerMaxBid && (
                <span className="text-primary animate-pulse">
                  SET: {formatCurrency(playerMaxBid)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ceiling amount"
                className={cn(
                  "rounded-xl h-12 bg-muted/30 border-muted",
                  playerMaxBid && "border-primary/50 text-primary font-bold",
                )}
                value={maxBidInput}
                onChange={(e) => setMaxBidInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMaxBid()}
              />
              <Button
                variant={playerMaxBid ? "default" : "secondary"}
                className="h-12 px-4 rounded-xl font-bold"
                onClick={handleMaxBid}
              >
                {playerMaxBid ? "RESET" : "SET"}
              </Button>
            </div>
          </div>
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
