/**
 * TheaterSideColumn.tsx - Right-hand column of the live auction theater
 *
 * Bid-history launcher, the bidder paddle grid, and the auctioneer chant log.
 */

import { History } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PaddleCard } from "@/domains/auction/ui/PaddleCard";
import { AuctioneerChant } from "@/domains/auction/ui/sub/AuctioneerChant";
import type { Stable } from "@/platform/game/types";
import type { AuctioneerLine } from "@/domains/auction/application/auctioneerService";

interface TheaterSideColumnProps {
  bidHistoryCount: number;
  onOpenHistory: () => void;
  stables: Stable[];
  activePaddle: string | null;
  leadingBidder: string | undefined;
  chantLines: AuctioneerLine[];
}

export function TheaterSideColumn({
  bidHistoryCount,
  onOpenHistory,
  stables,
  activePaddle,
  leadingBidder,
  chantLines,
}: TheaterSideColumnProps) {
  const majorStables = stables.filter((s) => s.isMajor);
  return (
    <div className="grid grid-cols-1 gap-8">
      {/* Bid History Button */}
      <Button
        variant="outline"
        className="h-14 rounded-2xl border-2 font-bold shadow-sm hover:bg-muted"
        onClick={onOpenHistory}
      >
        <History className="mr-2 h-5 w-5" />
        View Bid History ({bidHistoryCount})
      </Button>

      {/* Paddle Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Bidders
          </h3>
          <span className="text-[10px] font-bold text-muted-foreground/50">
            {majorStables.length} Major Stables
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {majorStables.map((stable, idx) => (
            <PaddleCard
              key={stable.id}
              stableName={stable.name}
              paddleNumber={idx + 1}
              colors={stable.colors}
              isActive={activePaddle === stable.id}
              isLeading={leadingBidder === stable.id}
            />
          ))}
        </div>
      </div>

      {/* Chant Log */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-2">
          Caller
        </h3>
        <AuctioneerChant lines={chantLines} />
      </div>
    </div>
  );
}
