import { createFileRoute } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";
import { auctionBrowseSearchSchema } from "@/constants/auctionSearchSchema";
import { AuctionTheater } from "@/components/auction/AuctionTheater";
import { SaleHeader } from "@/components/auction/SaleHeader";
import { CatalogIndex } from "@/components/auction/CatalogIndex";
import { LotDetailPanel } from "@/components/auction/LotDetailPanel";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { ConsignmentWithdrawal } from "@/components/auction/ConsignmentWithdrawal";
import { ResolvedSaleSummary } from "@/components/auction/ResolvedSaleSummary";
import { useAuctionSaleFilters } from "@/hooks/auction/useAuctionSaleFilters";
import { useAuctionSaleData } from "@/hooks/auction/useAuctionSaleData";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: AuctionSalePage,
});

function AuctionSalePage() {
  const { saleId } = Route.useParams();
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
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
  } = useAuctionSaleData(saleId, filters);

  if (!sale) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
          Sale not found
        </h1>
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
              <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
                <HardDrive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
                <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                  Data Unavailable
                </p>
                <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                  Central registry cannot identify lot data.
                </p>
              </div>
            ) : null}

            {isResolved && <ResolvedSaleSummary activeLots={activeLots} horseMap={horseMap} />}
          </main>
        </div>
      )}
    </div>
  );
}
