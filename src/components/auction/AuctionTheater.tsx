/**
 * AuctionTheater.tsx - Live auction theater orchestrator
 *
 * This component acts as the main container for the live auction-ring scene.
 * It uses the useAuctionTheater hook for logic and coordinates several
 * atomic sub-components for rendering.
 */

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/core/common/formatting";
import { useScoreboard } from "@/hooks/auction/useScoreboard";
import { BidHistoryPanel } from "./BidHistoryPanel";
import { WinOverlay } from "./WinOverlay";
import { PaddleCard } from "./PaddleCard";
import { useAuctionTheater } from "@/hooks/auction/useAuctionTheater";
import { AuctionRing } from "./sub/AuctionRing";
import { AuctionControls } from "./sub/AuctionControls";
import { AuctioneerChant } from "./sub/AuctioneerChant";
import { AuctionScoreboard } from "./sub/AuctionScoreboard";
import { AuctionSummary } from "./sub/AuctionSummary";
import { AuctionErrorState } from "./AuctionStates";
import { getDisplayableStats } from "@/core/npc/scouting";
import { Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { nextBidAmount } from "@/core/auction/runner";
import type { BidInputPanelHandle } from "./sub/BidInputPanel";

interface AuctionTheaterProps {
  saleId: string;
}

export function AuctionTheater({ saleId }: AuctionTheaterProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const scoutReports = useGame((s) => s.scoutReports);
  const stables = useGame((s) => s.npcStables);
  const horses = useGame((s) => s.horses);

  const {
    sale,
    lotState,
    currentLot,
    currentHorse,
    currentBid,
    leadingBidder,
    totalLots,
    lotIndex,
    playerIsLeading,
    bidHistory,
    chantLines,
    activePaddle,
    hammerFlash,
    done,
    committed,
    paused,
    setPaused,
    playerMaxBidState,
    setPlayerMaxBidState,
    historyOpen,
    setHistoryOpen,
    bannerFlash,
    winOverlay,
    bidError,
    dismissBidError,
    retryBid,
    canRetryBid,
    dismissedErrors,
    bidHistoryError,
    retryBidHistory,
    handleBid,
    handlePass,
    handleSkip,
    handleCommit,
  } = useAuctionTheater(saleId);

  const bidInputRef = useRef<BidInputPanelHandle>(null);

  const scoreboard = useScoreboard(saleId);

  // Derived info
  const scouted = currentHorse ? getDisplayableStats(currentHorse, scoutReports, day) : null;
  const isPlayerConsignment = !!(currentLot && !currentLot.consignorStableId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (done || paused) return;
      if (e.key === " " && !playerIsLeading && !isPlayerConsignment) {
        e.preventDefault();
        handleBid();
      }
      if (e.key.toLowerCase() === "p") {
        setPaused(!paused);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [done, paused, playerIsLeading, isPlayerConsignment, handleBid, setPaused]);

  if (!sale) {
    if (dismissedErrors.isDismissed(saleId, "sale_not_found")) {
      return null;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AuctionErrorState
          message="Sale not found in the registry."
          onDismiss={() => dismissedErrors.dismissError(saleId, "sale_not_found")}
          onRetry={() => {
            dismissedErrors.clearDismissed(saleId, "sale_not_found");
            router.invalidate();
          }}
          retryLabel="Reload Sale"
        />
        <Button onClick={() => navigate({ to: "/auction" })}>Back to Sales</Button>
      </div>
    );
  }

  // Final Summary View
  if (done && committed) {
    return (
      <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AuctionSummary
          sale={sale}
          scoreboard={scoreboard}
          onClose={() => navigate({ to: "/auction" })}
        />
      </div>
    );
  }

  // Pre-commit completion view
  if (done && !committed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-8 p-12">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h2 className="text-4xl font-black tracking-tight">Auction Finished</h2>
          <p className="text-muted-foreground text-lg">All lots have been hammered down.</p>
        </div>
        <Button
          size="lg"
          className="h-20 px-12 text-2xl font-black rounded-2xl shadow-2xl animate-bounce"
          onClick={handleCommit}
        >
          View Results Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8 min-h-screen pb-32">
      {/* Top Info Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-primary drop-shadow-sm">
            {sale.name}
          </h1>
          <p className="text-muted-foreground font-bold tracking-wide text-xs uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Live Auction Stream · Day {day}
          </p>
        </div>
        <AuctionScoreboard
          cash={cash}
          lotsRemaining={totalLots - lotIndex}
          scoreboard={scoreboard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Ring (Left) */}
        <div className="lg:col-span-7 space-y-8">
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
                chant={lotState?.chant}
                lotIndex={lotIndex}
                totalLots={totalLots}
                scoutOverall={scouted?.overallEstimate?.toString()}
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
                  Held by Paddle {stables.findIndex((s) => s.id === leadingBidder) + 1}
                </div>
              )}
            </div>
          </Card>

          <AuctionControls
            currentBid={currentBid}
            playerIsLeading={playerIsLeading}
            paused={paused}
            onTogglePause={() => setPaused(!paused)}
            onBid={handleBid}
            onPass={handlePass}
            onSkip={handleSkip}
            playerMaxBid={playerMaxBidState}
            onSetMaxBid={setPlayerMaxBidState}
            error={bidError}
            onDismissError={dismissBidError}
            onRetryBid={canRetryBid ? retryBid : undefined}
            isPlayerConsignment={isPlayerConsignment}
            bidInputRef={bidInputRef}
          />
        </div>

        {/* Side Column (Right) */}
        <div className="lg:col-span-5 space-y-8">
          <div className="grid grid-cols-1 gap-8">
            {/* Bid History Button */}
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-2 font-bold shadow-sm hover:bg-muted"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="mr-2 h-5 w-5" />
              View Bid History ({bidHistory.length})
            </Button>

            {/* Paddle Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Bidders
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground/50">
                  {stables.filter((s) => s.isMajor).length} Major Stables
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stables
                  .filter((s) => s.isMajor)
                  .map((stable, idx) => (
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
        </div>
      </div>

      {/* Overlays */}
      <BidHistoryPanel
        bidHistory={bidHistory}
        stables={stables}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
        error={bidHistoryError}
        onRetry={retryBidHistory}
        onPlaceBid={() => {
          setHistoryOpen(false);
          bidInputRef.current?.focusAndScroll(nextBidAmount(currentBid));
        }}
        canPlaceBid={!done && !playerIsLeading && !isPlayerConsignment}
      />

      {winOverlay && (
        <WinOverlay horseName={winOverlay.horseName} hammerPrice={winOverlay.hammerPrice} />
      )}
    </div>
  );
}
