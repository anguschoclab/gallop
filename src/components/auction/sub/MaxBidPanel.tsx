/**
 * MaxBidPanel.tsx - Max bid (proxy) input panel for auction controls
 *
 * Extracted from AuctionControls.tsx.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";

interface MaxBidPanelProps {
  currentBid: number;
  playerMaxBid: number | undefined;
  onSetMaxBid: (amount: number | undefined) => void;
}

export function MaxBidPanel({ currentBid, playerMaxBid, onSetMaxBid }: MaxBidPanelProps) {
  const [maxBidInput, setMaxBidInput] = useState("");

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
    <div className="space-y-2">
      <div className="text-[10px] uppercase font-bold text-muted-foreground ml-1 flex justify-between">
        <span>Max Bid (Auto)</span>
        {playerMaxBid && (
          <span className="text-primary animate-pulse">SET: {formatCurrency(playerMaxBid)}</span>
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
  );
}
