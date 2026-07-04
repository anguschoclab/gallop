import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";
import { auctionBrowseSearchSchema } from "@/constants/auctionSearchSchema";
import { AuctionTheater } from "@/components/auction/AuctionTheater";
import { SaleHeader } from "@/components/auction/SaleHeader";
import { CatalogIndex } from "@/components/auction/CatalogIndex";
import { LotDetailPanel } from "@/components/auction/LotDetailPanel";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { ConsignmentWithdrawal } from "@/components/auction/ConsignmentWithdrawal";
import { ResolvedSaleSummary } from "@/components/auction/ResolvedSaleSummary";
import { LotBidsPanel } from "@/components/auction/LotBidsPanel";
import { AuctionLoadingState, AuctionErrorState } from "@/components/auction/AuctionStates";
import { useAuctionSaleFilters } from "@/hooks/auction/useAuctionSaleFilters";
import { useAuctionSaleData } from "@/hooks/auction/useAuctionSaleData";
import { useStoreHydration } from "@/hooks/shared/useStoreHydration";
import { useDismissedAuctionErrors } from "@/hooks/auction/useDismissedAuctionErrors";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: AuctionSalePage,
});

function AuctionSalePage() {
  const { saleId } = Route.useParams();
  const router = useRouter();
  const isHydrated = useStoreHydration();
  const dismissedErrors = useDismissedAuctionErrors();
  const {
    filters,
    searchDraft,
    setSearchDraft,
    onUpdateFilter,
    onResetFilters,
    hasActiveFilters,
    navigate,
  } = useAuctionSaleFilters();

  const {
    sale,
    day,
    cash,
    horseMap,
    stables,
    activeLots,
    displayLots,
    currentLot,
    horse,
    consignor,
    displayStatsResult,
    currentPrice,
    nextBid,
    isResolved,
    isSaleDay,
    isPlayerLeading,
    isPlayerConsigned,
    lotIndex,
    setLotIndex,
    message,
    error,
    errorType,
    dismissError,
    retryLastBid,
    refetchSaleData,
    canRetry,
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
  } = useAuctionSaleData(saleId, filters);

  // Loading: store still rehydrating from persisted storage
  if (!isHydrated) {
    return <AuctionLoadingState />;
  }

  // Not found: hydration complete and sale truly missing
  if (!sale) {
    if (dismissedErrors.isDismissed(saleId, "sale_not_found")) {
      return null;
    }
    return (
      <div className="p-12 text-center space-y-4">
        <AuctionErrorState
          message="The requested sale could not be located in the registry."
          onDismiss={() => dismissedErrors.dismissError(saleId, "sale_not_found")}
          onRetry={() => {
            dismissedErrors.clearDismissed(saleId, "sale_not_found");
            router.invalidate();
            refetchSaleData();
          }}
          retryLabel="Reload Sale"
        />
        <button
          onClick={() => navigate({ to: "/auction" })}
          className="text-gold uppercase font-mono text-xs tracking-widest hover:underline"
        >
          ← Return to Exchange
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <SaleHeader
        sale={sale}
        isResolved={isResolved}
        isSaleDay={isSaleDay}
        activeLotCount={activeLots.length}
        cash={cash}
        onBack={() => navigate({ to: "/auction" })}
      />

      {error && (
        <AuctionErrorState
          message={error}
          onDismiss={dismissError}
          onRetry={canRetry ? retryLastBid : refetchSaleData}
          retryLabel={canRetry ? "Retry Bid" : "Reload Data"}
        />
      )}

      {isSaleDay && !isResolved ? (
        <AuctionTheater saleId={saleId} />
      ) : activeLots.length === 0 ? (
        <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
          <HardDrive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
          <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
            No Lots Listed Yet
          </p>
          <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
            Historical data for this window is unavailable.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <CatalogIndex
            displayLots={displayLots}
            lotIndex={lotIndex}
            horseMap={horseMap}
            isResolved={isResolved}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            onSelectLot={setLotIndex}
            onUpdateFilter={onUpdateFilter}
            onResetFilters={onResetFilters}
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
          />

          <main className="lg:col-span-8 space-y-8">
            {displayLots.length > 0 && currentLot && horse ? (
              <div className="space-y-8">
                <LotDetailPanel
                  lot={currentLot}
                  horse={horse}
                  consignor={consignor}
                  displayStats={displayStatsResult?.stats ?? null}
                  displayOverallEstimate={displayStatsResult?.overallEstimate}
                  isResolved={isResolved}
                  isPlayerLeading={isPlayerLeading}
                  isPlayerConsigned={isPlayerConsigned}
                  lotIndex={lotIndex}
                  totalLots={displayLots.length}
                />

                {!isResolved && !currentLot.passed && (
                  <BiddingPanel
                    currentLot={currentLot}
                    currentPrice={currentPrice}
                    nextBid={nextBid}
                    cash={cash}
                    isPlayerLeading={isPlayerLeading}
                    isPlayerConsigned={isPlayerConsigned}
                    buyNowPrice={currentLot.buyNowPrice}
                    horseName={horse.name}
                    onBid={handleBid}
                    onSetMaxBid={handleMaxBid}
                    onBuyNow={handleBuyNow}
                    message={message}
                  />
                )}

                {!isResolved && (
                  <LotBidsPanel
                    bidHistory={currentLot.bidHistory}
                    stables={stables}
                  />
                )}

                {isPlayerConsigned && !isResolved && (
                  <ConsignmentWithdrawal
                    horse={horse}
                    currentLot={currentLot}
                    sale={sale}
                    currentDay={day}
                    onWithdraw={handleWithdraw}
                  />
                )}
              </div>
            ) : displayLots.length > 0 && currentLot && !horse ? (
              <div className="p-12 text-center space-y-4">
                <AuctionErrorState
                  message="Central registry cannot identify lot data."
                  onDismiss={() => dismissedErrors.dismissError(saleId, "data_unavailable")}
                  onRetry={() => {
                    dismissedErrors.clearDismissed(saleId, "data_unavailable");
                    router.invalidate();
                    refetchSaleData();
                  }}
                  retryLabel="Reload Data"
                />
              </div>
            ) : null}

            {isResolved && <ResolvedSaleSummary activeLots={activeLots} horseMap={horseMap} />}
          </main>
        </div>
      )}
    </div>
  );
}
