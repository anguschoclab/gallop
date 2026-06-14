import { createFileRoute } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useState, useEffect, useMemo, useCallback } from "react";
import { HardDrive } from "lucide-react";
import type { AuctionLot } from "@/game/types";
import {
  auctionBrowseSearchSchema,
  type AuctionBrowseSearch,
} from "@/constants/auctionSearchSchema";
import { filterAndSortLots } from "@/services/auction/auctionLotFilter";
import { getDisplayableStats } from "@/core/npc/scouting";
import { AuctionTheater } from "@/components/auction/AuctionTheater";
import { PlayerConsignmentsPanel } from "@/components/auction/PlayerConsignmentsPanel";
import { SaleHeader } from "@/components/auction/SaleHeader";
import { CatalogIndex } from "@/components/auction/CatalogIndex";
import { LotDetailPanel } from "@/components/auction/LotDetailPanel";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { ConsignmentWithdrawal } from "@/components/auction/ConsignmentWithdrawal";
import { ResolvedSaleSummary } from "@/components/auction/ResolvedSaleSummary";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: AuctionSalePage,
});

function AuctionSalePage() {
  const { saleId } = Route.useParams();
  const navigate = Route.useNavigate();
  const filters = Route.useSearch();
  const { sex, ageBand, reserveBand, sort, q } = filters;

  // Store selectors
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const horseMap = useGameWithShallow((s) => s.horseMap ?? new Map());
  const cash = useGame((s) => s.cash);
  const stables = useGame((s) => s.npcStables);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const placeBookBid = useGame((s) => s.placeBookBid);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const buyNow = useGame((s) => s.buyNow);

  // Local state
  const sale = auctions.find((a) => a.id === saleId);
  const [lotIndex, setLotIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [searchDraft, setSearchDraft] = useState(q ?? "");

  // URL search sync
  useEffect(() => {
    const id = setTimeout(() => {
      navigate({
        search: (prev: AuctionBrowseSearch) => ({ ...prev, q: searchDraft.trim() || undefined }),
      });
    }, 200);
    return () => clearTimeout(id);
  }, [searchDraft, navigate]);

  useEffect(() => {
    setSearchDraft(q ?? "");
  }, [q]);

  // Lot filtering
  const activeLots: AuctionLot[] = useMemo(
    () => (sale ? (sale.lots as AuctionLot[]).filter((l) => !l.withdrawn) : []),
    [sale],
  );

  const filteredLots = useMemo(
    () =>
      filterAndSortLots(activeLots, horses, {
        sex,
        ageBand,
        reserveBand,
        sort,
        q,
      }),
    [activeLots, horses, sex, ageBand, reserveBand, sort, q],
  );

  const filterKey = `${sex ?? ""}|${ageBand ?? ""}|${reserveBand ?? ""}|${sort ?? ""}|${q ?? ""}`;

  useEffect(() => {
    setLotIndex(0);
    setMessage("");
  }, [filterKey]);

  const hasActiveFilters =
    sex !== undefined || ageBand !== undefined || reserveBand !== undefined || q !== undefined;

  const onUpdateFilter = useCallback(
    (
      update: Partial<AuctionBrowseSearch> | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
    ) => {
      navigate({
        search: (prev: AuctionBrowseSearch) =>
          typeof update === "function" ? update(prev) : { ...prev, ...update },
      });
    },
    [navigate],
  );

  const onResetFilters = useCallback(() => navigate({ search: () => ({}) }), [navigate]);

  // Not found state
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

  // Derived state
  const isResolved = sale.resolved;
  const isSaleDay = sale.day === day;
  const displayLots = isResolved ? activeLots : filteredLots;
  const currentLot = displayLots[lotIndex];
  const horse = currentLot ? horseMap.get(currentLot.horseId) : undefined;
  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);
  const consignor = currentLot?.consignorStableId
    ? stableMap.get(currentLot.consignorStableId)
    : undefined;
  const displayStatsResult = horse ? getDisplayableStats(horse, scoutReports, day) : null;
  const currentPrice = currentLot?.hammerPrice ?? 0;
  const nextBid = Math.ceil((currentPrice * 1.05 + 200) / 100) * 100;
  const isPlayerLeading =
    currentLot && !currentLot.soldToStableId && currentLot.hammerPrice !== undefined;
  const isPlayerConsigned = currentLot && !currentLot.consignorStableId;
  const playerConsignedLots = activeLots.filter((l) => !l.consignorStableId);

  // Bid handlers
  const handleBid = useCallback(
    (amount: number) => {
      if (!currentLot) return;
      if (amount <= currentPrice) {
        setMessage("Bid must exceed current price.");
        return;
      }
      if (amount > cash) {
        setMessage("Insufficient funds.");
        return;
      }
      const result = placeBookBid(sale.id, currentLot.id, amount);
      if (result.ok) {
        setMessage("Bid placed.");
      } else {
        setMessage(result.reason ?? "Bid failed");
      }
    },
    [currentLot, currentPrice, cash, placeBookBid, sale.id],
  );

  const handleMaxBid = useCallback(
    (max: number | undefined) => {
      if (max && max <= currentPrice) {
        setMessage("Max bid must exceed current price.");
        return;
      }
      if (max) handleBid(max);
    },
    [currentPrice, handleBid],
  );

  const handleWithdraw = useCallback(() => {
    if (!currentLot) return;
    setLotIndex(0);
    const result = withdrawConsignment(currentLot.horseId);
    if (!result.ok) setMessage(result.reason ?? "Withdrawal failed");
  }, [currentLot, withdrawConsignment]);

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
                  isPlayerLeading={!!isPlayerLeading}
                  isPlayerConsigned={!!isPlayerConsigned}
                  lotIndex={lotIndex}
                  totalLots={displayLots.length}
                />

                {!isResolved && !currentLot.passed && (
                  <BiddingPanel
                    currentLot={currentLot}
                    currentPrice={currentPrice}
                    nextBid={nextBid}
                    cash={cash}
                    isPlayerLeading={!!isPlayerLeading}
                    isPlayerConsigned={!!isPlayerConsigned}
                    buyNowPrice={currentLot.buyNowPrice}
                    horseName={horse.name}
                    onBid={handleBid}
                    onSetMaxBid={handleMaxBid}
                    onBuyNow={() => buyNow(sale.id, currentLot.id)}
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
