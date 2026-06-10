/**
 * BidInputPanel.tsx - Custom bid input panel for auction controls
 *
 * Extracted from AuctionControls.tsx.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatting";

interface BidInputPanelProps {
  currentBid: number;
  nextMin: number;
  onBid: (amount: number) => void;
}

export function BidInputPanel({ currentBid, nextMin, onBid }: BidInputPanelProps) {
  const [customBid, setCustomBid] = useState("");

  const handleCustomBid = () => {
    const val = parseInt(customBid);
    if (isNaN(val) || val <= currentBid) return;
    onBid(val);
    setCustomBid("");
  };

  return (
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
  );
}
