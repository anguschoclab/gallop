import { TOOLTIP_DELAY_MS } from "@/constants";
/**
 * BiddingPanel.tsx - Auction bidding controls
 *
 * Exchange terminal with bid buttons, manual input, and auto-bid.
 * Extracted from auction.$saleId.tsx.
 */

import { Button } from "@/components/ui/button";
import { Gavel, Activity } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { BuyNowDialog } from "./BuyNowDialog";
import { BidInputPanel } from "./sub/BidInputPanel";
import { MaxBidPanel } from "./sub/MaxBidPanel";
import { cn } from "@/lib/cn";
import type { AuctionLot } from "@/game/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
            {cash < nextBid || isPlayerLeading || isPlayerConsigned ? (
              <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="flex-1 inline-block cursor-not-allowed">
                      <Button
                        className="w-full h-14 bg-success/50 text-slate-950/50 font-black uppercase tracking-[0.2em] rounded-none text-xs pointer-events-none"
                        disabled
                      >
                        <Gavel className="h-4 w-4 mr-3" />
                        Bid {formatCurrency(nextBid)}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPlayerConsigned
                      ? "Cannot bid on your own consignment."
                      : isPlayerLeading
                        ? "You are already leading the bidding."
                        : `Not enough cash (${formatCurrency(nextBid)} required).`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                className="flex-1 h-14 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-xs shadow-lg group"
                onClick={() => onBid(nextBid)}
              >
                <Gavel className="h-4 w-4 mr-3 group-hover:rotate-12 transition-transform" />
                Bid {formatCurrency(nextBid)}
              </Button>
            )}
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
            <BidInputPanel currentBid={currentPrice} nextMin={nextBid} onBid={onBid} />
            <MaxBidPanel
              currentBid={currentPrice}
              playerMaxBid={undefined}
              onSetMaxBid={onSetMaxBid}
            />
          </div>
        </div>

        {message && (
          <div
            className={cn(
              "p-3 text-center font-mono text-[10px] uppercase font-black tracking-widest border-t border-white/5",
              message.includes("placed")
                ? "text-success bg-success/5"
                : "text-destructive bg-destructive/5",
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
