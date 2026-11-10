/**
 * TheaterLiveView.tsx - Main live-sale layout for the auction theater
 *
 * Top info bar, ring card + controls grid, side column, and the bid-history /
 * win overlays. Receives the useAuctionTheater result wholesale.
 */

import { useScoreboard } from "@/domains/auction/application/hooks/useScoreboard";
import { useAuctionTheater } from "@/domains/auction/application/hooks/useAuctionTheater";
import { BidHistoryPanel } from "@/domains/auction/ui/BidHistoryPanel";
import { WinOverlay } from "@/domains/auction/ui/WinOverlay";
import { AuctionControls } from "@/domains/auction/ui/sub/AuctionControls";
import { AuctionScoreboard } from "@/domains/auction/ui/sub/AuctionScoreboard";
import { TheaterRingCard } from "@/domains/auction/ui/sub/TheaterRingCard";
import { TheaterSideColumn } from "@/domains/auction/ui/sub/TheaterSideColumn";
import { getDisplayableStats } from "@/domains/agents/application/npcFacade";
import { nextBidAmount } from "@/domains/auction/application/auctionFacade";
import type { BidInputPanelHandle } from "@/domains/auction/ui/sub/BidInputPanel";
import type { Stable } from "@/platform/game/types";

interface TheaterLiveViewProps {
  theater: ReturnType<typeof useAuctionTheater>;
  day: number;
  cash: number;
  stables: Stable[];
  scouted: ReturnType<typeof getDisplayableStats> | null;
  isPlayerConsignment: boolean;
  scoreboard: ReturnType<typeof useScoreboard>;
  bidInputRef: React.RefObject<BidInputPanelHandle | null>;
}

export function TheaterLiveView({
  theater,
  day,
  cash,
  stables,
  scouted,
  isPlayerConsignment,
  scoreboard,
  bidInputRef,
}: TheaterLiveViewProps) {
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
    bidHistoryError,
    retryBidHistory,
    handleBid,
    handlePass,
    handleSkip,
  } = theater;

  if (!sale) return null;

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
          <TheaterRingCard
            hammerFlash={hammerFlash}
            bannerFlash={bannerFlash}
            currentHorse={currentHorse}
            currentLot={currentLot}
            chant={lotState?.chant}
            lotIndex={lotIndex}
            totalLots={totalLots}
            scoutOverall={scouted?.overallEstimate?.toString()}
            currentBid={currentBid}
            playerIsLeading={playerIsLeading}
            leadingBidder={leadingBidder}
            leadingPaddleNumber={stables.findIndex((s) => s.id === leadingBidder) + 1}
          />

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
          <TheaterSideColumn
            bidHistoryCount={bidHistory.length}
            onOpenHistory={() => setHistoryOpen(true)}
            stables={stables}
            activePaddle={activePaddle}
            leadingBidder={leadingBidder}
            chantLines={chantLines}
          />
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
