/**
 * AuctionTheater.tsx - Live auction theater orchestrator
 *
 * This component acts as the main container for the live auction-ring scene.
 * It uses the useAuctionTheater hook for logic and coordinates several
 * atomic sub-components for rendering.
 */

import { useRef } from "react";
import { useGame } from "@/platform/game/store";
import { useNavigate } from "@tanstack/react-router";
import { useScoreboard } from "@/domains/auction/application/hooks/useScoreboard";
import { useAuctionTheater } from "@/domains/auction/application/hooks/useAuctionTheater";
import { useTheaterHotkeys } from "@/domains/auction/application/hooks/useTheaterHotkeys";
import { AuctionSummary } from "@/domains/auction/ui/sub/AuctionSummary";
import { TheaterLiveView } from "@/domains/auction/ui/sub/TheaterLiveView";
import { TheaterNotFound } from "@/domains/auction/ui/sub/TheaterNotFound";
import { TheaterFinished } from "@/domains/auction/ui/sub/TheaterFinished";
import { getDisplayableStats } from "@/domains/agents/application/npcFacade";
import type { BidInputPanelHandle } from "@/domains/auction/ui/sub/BidInputPanel";

interface AuctionTheaterProps {
  saleId: string;
}

export function AuctionTheater({ saleId }: AuctionTheaterProps) {
  const navigate = useNavigate();
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const scoutReports = useGame((s) => s.scoutReports);
  const stables = useGame((s) => s.npcStables);

  const theater = useAuctionTheater(saleId);

  const bidInputRef = useRef<BidInputPanelHandle>(null);

  const scoreboard = useScoreboard(saleId);

  // Derived info
  const scouted = theater.currentHorse
    ? getDisplayableStats(theater.currentHorse, scoutReports, day)
    : null;
  const isPlayerConsignment = !!(theater.currentLot && !theater.currentLot.consignorStableId);

  useTheaterHotkeys({
    done: theater.done,
    paused: theater.paused,
    playerIsLeading: theater.playerIsLeading,
    isPlayerConsignment,
    handleBid: theater.handleBid,
    setPaused: theater.setPaused,
  });

  if (!theater.sale) {
    return (
      <TheaterNotFound
        saleId={saleId}
        isDismissed={theater.dismissedErrors.isDismissed}
        dismissError={theater.dismissedErrors.dismissError}
        clearDismissed={theater.dismissedErrors.clearDismissed}
      />
    );
  }

  // Final Summary View
  if (theater.done && theater.committed) {
    return (
      <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AuctionSummary
          sale={theater.sale}
          scoreboard={scoreboard}
          onClose={() => navigate({ to: "/auction" })}
        />
      </div>
    );
  }

  // Pre-commit completion view
  if (theater.done && !theater.committed) {
    return <TheaterFinished onCommit={theater.handleCommit} />;
  }

  return (
    <TheaterLiveView
      theater={theater}
      day={day}
      cash={cash}
      stables={stables}
      scouted={scouted}
      isPlayerConsignment={isPlayerConsignment}
      scoreboard={scoreboard}
      bidInputRef={bidInputRef}
    />
  );
}
