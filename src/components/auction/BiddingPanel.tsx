/**
 * BiddingPanel.tsx - Auction bidding controls
 *
 * Exchange terminal with bid buttons, manual input, and auto-bid.
 * Extracted from auction.$saleId.tsx.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gavel, Activity, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { BuyNowDialog } from "./BuyNowDialog";
import { cn } from "@/lib/utils";
import type { AuctionLot } from "@/game/types";

interface BiddingPanelProps {
  currentLot: AuctionLot;
  currentPrice: number;
  nextBid: number;
  cash: number;
  isPlayerLeading: boolean;
  isPlayerConsigned: boolean;
  buyNowPrice?: number;
  horseName: string;
  onBid: (amount: number) => void;
  onSetMaxBid: (max: number | undefined) => void;
  onBuyNow: () => { ok: boolean; reason?: string };
  message: string;
}

export function BiddingPanel({
  currentLot,
  currentPrice,
  nextBid,
  cash,
  isPlayerLeading,
  isPlayerConsigned,
  buyNowPrice,
  horseName,
  onBid,
  onSetMaxBid,
  onBuyNow,
  message,
}: BiddingPanelProps) {
  const [bidInput, setBidInput] = useState("");
  const [maxBidInput, setMaxBidInput] = useState("");
  const [currentMaxBid, setCurrentMaxBid] = useState<number | undefined>(undefined);

  const handleCustomBid = () => {
    const amount = Number(bidInput.replace(/,/g, ""));
    if (amount > currentPrice) {
      onBid(amount);
      setBidInput("");
    }
  };

  const handleSetMaxBid = () => {
    const max = Number(maxBidInput.replace(/,/g, ""));
    if (max > currentPrice) {
      setCurrentMaxBid(max);
      onSetMaxBid(max);
    } else {
      setCurrentMaxBid(undefined);
      onSetMaxBid(undefined);
    }
    setMaxBidInput("");
  };

  if (currentLot.passed) return null;

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Activity className="h-3.5 w-3.5 text-success/60" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">
          Exchange Terminal
        </h3>
      </div>
      <div className="bg-black/40 border border-success/20 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-0.5">
            <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
              Market Valuation
            </div>
            <div className="text-3xl font-black font-mono text-success tabular-nums tracking-tighter">
              {currentPrice > 0 ? formatCurrency(currentPrice) : "No bids"}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
              Required Step
            </div>
            <div className="text-sm font-black font-mono text-gold-muted tabular-nums tracking-tighter">
              +{formatCurrency(nextBid - currentPrice)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              className="flex-1 h-14 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-xs shadow-lg group"
              onClick={() => onBid(nextBid)}
              disabled={cash < nextBid || isPlayerLeading || isPlayerConsigned}
            >
              <Gavel className="h-4 w-4 mr-3 group-hover:rotate-12 transition-transform" />
              Bid {formatCurrency(nextBid)}
            </Button>
            {buyNowPrice !== undefined && !isPlayerConsigned && (
              <BuyNowDialog
                horseName={horseName}
                buyNowPrice={buyNowPrice}
                cash={cash}
                onBuyNow={onBuyNow}
                disabled={cash < buyNowPrice}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase font-black text-cream/20 tracking-widest px-1">
                Manual_Offer
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Amount..."
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value)}
                  className="h-10 bg-slate-950 border-white/5 text-xs font-mono uppercase tracking-tighter focus-visible:ring-success/30 rounded-none"
                />
                <Button
                  variant="outline"
                  className="h-10 px-4 border-white/10 text-cream/60 uppercase text-[9px] font-black tracking-widest rounded-none hover:bg-white/5"
                  onClick={handleCustomBid}
                >
                  Bid
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase font-black text-cream/20 tracking-widest px-1">
                Auto Bid Limit
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Limit..."
                  value={maxBidInput}
                  onChange={(e) => setMaxBidInput(e.target.value)}
                  className={cn(
                    "h-10 bg-slate-950 border-white/5 text-xs font-mono uppercase tracking-tighter focus-visible:ring-gold/30 rounded-none",
                    currentMaxBid && "border-gold/50 text-gold"
                  )}
                />
                <Button
                  variant={currentMaxBid ? "default" : "outline"}
                  className="h-10 px-4 border-white/10 text-gold/60 uppercase text-[9px] font-black tracking-widest rounded-none hover:bg-gold/5"
                  onClick={handleSetMaxBid}
                >
                  {currentMaxBid ? "Reset" : "Set Max"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={cn(
              "p-3 text-center font-mono text-[10px] uppercase font-black tracking-widest border-t border-white/5",
              message.includes("placed")
                ? "text-success bg-success/5"
                : "text-destructive bg-destructive/5"
            )}
          >
            {message}
          </div>
        )}
      </div>
      <p className="text-[8px] text-cream/20 uppercase italic text-center tracking-widest">
        Terminal secured via central exchange authority. All bids binding.
      </p>
    </section>
  );
}
