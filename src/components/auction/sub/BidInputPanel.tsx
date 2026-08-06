/**
 * BidInputPanel.tsx - Custom bid input panel for auction controls
 *
 * Extracted from AuctionControls.tsx.
 */

import { forwardRef, useImperativeHandle, useRef, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/core/common/formatting";

export type BidInputPanelHandle = {
  focusAndScroll: (prefillAmount?: number) => void;
};

interface BidInputPanelProps {
  currentBid: number;
  nextMin: number;
  onBid: (amount: number) => void;
}

export const BidInputPanel = forwardRef<BidInputPanelHandle, BidInputPanelProps>(
  function BidInputPanel({ currentBid, nextMin, onBid }, ref) {
    const [customBid, setCustomBid] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();

    useImperativeHandle(ref, () => ({
      focusAndScroll: (prefillAmount?: number) => {
        if (prefillAmount !== undefined) {
          setCustomBid(String(prefillAmount));
        }
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        inputRef.current?.focus();
      },
    }));

    const handleCustomBid = () => {
      const val = parseInt(customBid);
      if (isNaN(val) || val <= currentBid) return;
      onBid(val);
      setCustomBid("");
    };

    return (
      <div id="bid-input-panel" className="space-y-2">
        <label
          htmlFor={inputId}
          className="block text-[10px] uppercase font-bold text-muted-foreground ml-1 cursor-pointer"
        >
          Custom Bid
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            type="number"
            min={nextMin}
            ref={inputRef}
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
  },
);
