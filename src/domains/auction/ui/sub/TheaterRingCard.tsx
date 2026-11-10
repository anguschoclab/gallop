/**
 * TheaterRingCard.tsx - The live auction ring card
 *
 * The framed lot presentation: auctioneer banner flash, the AuctionRing itself,
 * and the current-bid price overlay.
 */

import { Card, CardContent } from "@/shared/ui/card";
import { formatCurrency } from "@/shared/common/formatting";
import { cn } from "@/shared/lib/cn";
import { AuctionRing } from "@/domains/auction/ui/sub/AuctionRing";
import type { AuctionLot, Horse } from "@/platform/game/types";
import type { ChantPhase } from "@/domains/auction/application/auctionFacade";

interface TheaterRingCardProps {
  hammerFlash: boolean;
  bannerFlash: boolean;
  currentHorse: Horse | undefined;
  currentLot: AuctionLot | undefined;
  chant: ChantPhase | undefined;
  lotIndex: number;
  totalLots: number;
  scoutOverall: string | undefined;
  currentBid: number;
  playerIsLeading: boolean;
  leadingBidder: string | undefined;
  leadingPaddleNumber: number;
}

export function TheaterRingCard({
  hammerFlash,
  bannerFlash,
  currentHorse,
  currentLot,
  chant,
  lotIndex,
  totalLots,
  scoutOverall,
  currentBid,
  playerIsLeading,
  leadingBidder,
  leadingPaddleNumber,
}: TheaterRingCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-4 transition-all duration-500 shadow-2xl rounded-3xl",
        hammerFlash ? "border-primary/60 bg-primary/5 scale-[1.01]" : "border-border/40",
      )}
    >
      {bannerFlash && (
        <div className="absolute top-0 left-0 w-full bg-success text-success-foreground py-2 text-center text-xs font-black tracking-wide uppercase z-20 animate-in slide-in-from-top duration-300">
          You are leading the bid!
        </div>
      )}

      <CardContent className="p-8">
        <AuctionRing
          horse={currentHorse}
          lot={currentLot}
          chant={chant}
          lotIndex={lotIndex}
          totalLots={totalLots}
          scoutOverall={scoutOverall}
        />
      </CardContent>

      {/* Price Overlay */}
      <div className="absolute top-8 right-8 text-right bg-background/80 backdrop-blur-md p-6 rounded-3xl border border-border/50 shadow-xl min-w-[200px]">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wide">
          Current Bid
        </div>
        <div
          className={cn(
            "text-5xl font-black tabular-nums transition-colors duration-300",
            playerIsLeading ? "text-success" : "text-foreground",
          )}
        >
          {formatCurrency(currentBid)}
        </div>
        {leadingBidder && (
          <div className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-wide flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Held by Paddle {leadingPaddleNumber}
          </div>
        )}
      </div>
    </Card>
  );
}
