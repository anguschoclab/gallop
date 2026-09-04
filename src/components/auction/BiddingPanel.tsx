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
import { PrestigeBadge } from "@/components/shared/PrestigeBadge";
import { housePrestigeMultiplier, type AuctionHouse } from "@/core/prestige";

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
  /** Staging house — its prestige lifts or softens rival bidding. */
  house?: AuctionHouse;
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
  house,
}: BiddingPanelProps) {
  if (currentLot.passed) return null;

  const upliftPct = house ? Math.round((housePrestigeMultiplier(house) - 1) * 100) : 0;
  const reserve = currentLot.reservePrice ?? 0;
  const reserveMet = reserve <= 0 || currentPrice >= reserve;

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Activity className="h-3.5 w-3.5 text-success/60" />
        <h3 className="text-[10px] font-black uppercase tracking-wide text-success/60">Bid</h3>
      </div>
      <div className="bg-black/40 border border-success/20 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-0.5">
            <div className="text-[8px] font-black uppercase text-cream/20 tracking-wide">
              Current Bid
            </div>
            <div className="text-3xl font-black font-mono text-success tabular-nums tracking-tighter">
              {currentPrice > 0 ? formatCurrency(currentPrice) : "No bids"}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[8px] font-black uppercase text-cream/20 tracking-wide">
              Next Bid Increment
            </div>
            <div className="text-sm font-black font-mono text-gold-muted tabular-nums tracking-tighter">
              +{formatCurrency(nextBid - currentPrice)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4 font-mono text-[9px] uppercase tracking-wide text-cream/40">
          {house && (
            <>
              <span className="text-cream/30">
                Ring: <span className="text-gold-muted">{house.shortName}</span>
              </span>
              <PrestigeBadge score={house.prestige} />
              <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className={cn(
                        "font-black tabular-nums",
                        upliftPct > 0
                          ? "text-success"
                          : upliftPct < 0
                            ? "text-destructive"
                            : "text-cream/40",
                      )}
                    >
                      Bench {upliftPct > 0 ? "+" : ""}
                      {upliftPct}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Prestige {house.prestige}/100 shifts rival bidding ceilings by{" "}
                    {upliftPct > 0 ? "+" : ""}
                    {upliftPct}%. Expect {upliftPct >= 0 ? "stronger" : "softer"} competition here.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <span
            className={cn("font-black", reserveMet ? "text-success" : "text-gold-muted")}
            aria-label={reserveMet ? "Reserve met" : "Reserve not yet met"}
          >
            {reserve <= 0 ? "No reserve" : reserveMet ? "Reserve met" : "Reserve not met"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {cash < nextBid || isPlayerLeading || isPlayerConsigned ? (
              <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="flex-1 inline-block cursor-not-allowed">
                      <Button
                        className="w-full h-14 bg-success/50 text-slate-950/50 font-black uppercase tracking-wide rounded-none text-xs pointer-events-none"
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
                className="flex-1 h-14 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-wide rounded-none text-xs shadow-lg group"
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
              "p-3 text-center font-mono text-[10px] uppercase font-black tracking-wide border-t border-white/5",
              message.includes("placed")
                ? "text-success bg-success/5"
                : "text-destructive bg-destructive/5",
            )}
          >
            {message}
          </div>
        )}
      </div>
      <p className="text-[8px] text-cream/20 uppercase italic text-center tracking-wide">
        All bids are binding.
      </p>
    </section>
  );
}
