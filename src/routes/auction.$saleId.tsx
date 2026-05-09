import { createFileRoute } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { getDisplayableStats } from "@/game/scouting";
import { KIND_LABELS } from "@/game/auctionData";
import { netProceeds } from "@/game/auction";
import { Gavel, ChevronLeft, ChevronRight, Trophy, Trash2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { genderSymbol } from "@/core/horse/gender";
import type { AuctionLot } from "@/game/types";
import { cn } from "@/lib/utils";
import { HorsePortrait } from "@/components/HorsePortrait";
import { AuctionTheater } from "@/components/auction/AuctionTheater";
import { BuyNowDialog } from "@/components/auction/BuyNowDialog";
import { auctionBrowseSearchSchema, type AuctionBrowseSearch } from "@/lib/auctionSearchSchema";
import { filterAndSortLots } from "@/services/auctionLotFilter";
import { PlayerConsignmentsPanel } from "@/components/auction/PlayerConsignmentsPanel";
import { AuctionFilterBar } from "@/components/auction/AuctionFilterBar";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: AuctionSalePage,
});

function AuctionSalePage() {
  const { saleId } = Route.useParams();
  const navigate = Route.useNavigate();
  const filters = Route.useSearch();
  const { sex, ageBand, reserveBand, sort, q } = filters;
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const stables = useGame((s) => s.npcStables);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const placeBookBid = useGame((s) => s.placeBookBid);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const buyNow = useGame((s) => s.buyNow);

  const sale = auctions.find((a: { id: string }) => a.id === saleId);
  const [lotIndex, setLotIndex] = useState(0);
  const [bidInput, setBidInput] = useState("");
  const [maxBid, setMaxBid] = useState("");
  const [message, setMessage] = useState("");

  // C2 — Search draft for debounced URL writes
  const [searchDraft, setSearchDraft] = useState(q ?? "");

  // Sync draft back to URL after 200 ms of inactivity
  useEffect(() => {
    const id = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: searchDraft.trim() || undefined }),
      });
    }, 200);
    return () => clearTimeout(id);
  }, [searchDraft, navigate]);

  // Keep draft in sync if URL param changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchDraft(q ?? "");
  }, [q]);

  // All hooks must be declared before any early return (Rules of Hooks).
  // activeLots handles the sale-not-found case by yielding [].
  const activeLots: AuctionLot[] = useMemo(
    () => (sale ? (sale.lots as AuctionLot[]).filter((l) => !l.withdrawn) : []),
    [sale],
  );

  // C1/C2/C3 — Derive filtered + sorted lot list
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

  // C5 — Reset lot index to 0 when filters/sort change
  const filterKey = `${sex ?? ""}|${ageBand ?? ""}|${reserveBand ?? ""}|${sort ?? ""}|${q ?? ""}`;

  useEffect(() => {
    setLotIndex(0);
    setMessage("");
  }, [filterKey]);

  const hasActiveFilters =
    sex !== undefined || ageBand !== undefined || reserveBand !== undefined || q !== undefined;

  const onUpdateFilter = (
    update:
      | Partial<AuctionBrowseSearch>
      | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
  ) => {
    navigate({
      search: (prev) => (typeof update === "function" ? update(prev) : { ...prev, ...update }),
    });
  };

  const onResetFilters = () => navigate({ search: () => ({}) });

  // Early return after all hooks
  if (!sale) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Sale not found</h1>
        <Button variant="ghost" onClick={() => navigate({ to: "/auction" })}>
          ← Back to Sales
        </Button>
      </div>
    );
  }

  // In resolved mode the filter controls are hidden, so use full activeLots for
  // the navigator to avoid a zero-length result from stale URL filter params.
  const isResolved = sale.resolved;
  const isSaleDay = sale.day === day;
  const displayLots = isResolved ? activeLots : filteredLots;

  const currentLot: AuctionLot | undefined = displayLots[lotIndex];
  const horse = currentLot ? horses.find((h) => h.id === currentLot.horseId) : undefined;
  const consignor = currentLot?.consignorStableId
    ? stables.find((s: { id: string }) => s.id === currentLot.consignorStableId)
    : undefined;
  const displayStatsResult = horse ? getDisplayableStats(horse, scoutReports, day) : null;
  const displayStats = displayStatsResult?.stats ?? null;
  const currentPrice = currentLot?.hammerPrice ?? 0;
  const nextBid = Math.ceil((currentPrice * 1.05 + 200) / 100) * 100;
  const isPlayerLeading =
    currentLot && !currentLot.soldToStableId && currentLot.hammerPrice !== undefined;
  const isPlayerConsigned = currentLot && !currentLot.consignorStableId;
  const playerConsignedLots = activeLots.filter((l: AuctionLot) => !l.consignorStableId);

  function bid(amount: number) {
    if (!currentLot) return;
    if (amount <= currentPrice) {
      setMessage("Bid must exceed current price.");
      return;
    }
    if (amount > cash) {
      setMessage("Insufficient funds.");
      return;
    }
    const result = placeBookBid(sale!.id, currentLot.id, amount);
    if (result.ok) {
      setMessage(`Bid of ${formatCurrency(amount)} placed.`);
      setBidInput("");
      setMaxBid("");
    } else {
      setMessage(result.reason);
    }
  }

  function handleMaxBid() {
    const cap = Number(maxBid.replace(/,/g, ""));
    if (!cap || cap <= currentPrice) {
      setMessage("Max bid must exceed current price.");
      return;
    }
    bid(cap);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/auction" })}
            className="mb-2 -ml-2"
          >
            ← Sales
          </Button>
          <h1 className="text-2xl font-bold">{sale.name}</h1>
          <p className="text-sm text-cream-muted tabular-nums">
            {gameCalendarDate(sale.day)} · {KIND_LABELS[sale.kind] ?? sale.kind}
            {isResolved && " · Resolved"}
          </p>
        </div>
        <Badge className={isResolved ? "bg-t600 text-cream" : "bg-t700 text-cream"}>
          {isResolved ? "Completed" : "Open"}
        </Badge>
      </div>

      {/* Three-mode split */}
      {isSaleDay && !isResolved ? (
        <AuctionTheater saleId={saleId} />
      ) : activeLots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-cream-muted">
            No lots in this sale.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* B2 — Your Consignments (resolved sales only) */}
          {isResolved && (
            <PlayerConsignmentsPanel
              playerConsignedLots={playerConsignedLots}
              horses={horses}
              stables={stables}
            />
          )}

          {/* C2 — Search input (pre-sale only) */}
          {!isResolved && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-muted pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search by name or sire…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
            </div>
          )}

          {/* C1 — Filter bar + C3 — Sort (pre-sale only) */}
          {!isResolved && (
            <AuctionFilterBar
              search={filters}
              hasActiveFilters={hasActiveFilters}
              onUpdateFilter={onUpdateFilter}
              onReset={onResetFilters}
            />
          )}

          {/* C4 — Result count (pre-sale only, hidden when unfiltered) */}
          {!isResolved && filteredLots.length < activeLots.length && (
            <p className="text-sm text-cream-muted tabular-nums">
              Showing {filteredLots.length} of {activeLots.length} lots
            </p>
          )}

          {/* C5 — Lot navigation (hidden when display set is empty) */}
          {displayLots.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums">
                Lot {lotIndex + 1} of {displayLots.length}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLotIndex((i) => Math.max(0, i - 1));
                    setMessage("");
                  }}
                  disabled={lotIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLotIndex((i) => Math.min(displayLots.length - 1, i + 1));
                    setMessage("");
                  }}
                  disabled={lotIndex === displayLots.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* C5 — Empty state when filtered set is empty (pre-sale only) */}
          {!isResolved && filteredLots.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-cream-muted">No lots match your filters.</p>
                <Button variant="ghost" size="sm" onClick={() => navigate({ search: () => ({}) })}>
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lot card */}
          {displayLots.length > 0 && currentLot && horse ? (
            <Card className={currentLot.passed ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <HorsePortrait
                      id={horse.id}
                      coatColor={horse.coatColor}
                      markings={horse.markings}
                      gender={horse.gender}
                      appearance={horse.appearance}
                      size="md"
                    />
                    <div>
                      <CardTitle className="text-xl text-cream">{horse.name}</CardTitle>
                      <p className="text-sm text-cream-muted mt-0.5 tabular-nums">
                        {genderSymbol(horse.gender)}{" "}
                        {horse.gender.charAt(0).toUpperCase() + horse.gender.slice(1)} · Age{" "}
                        {horse.age}
                        {horse.hemisphere === "Southern" ? " · Southern" : ""}
                      </p>
                    </div>
                  </div>
                  {currentLot.passed && <Badge variant="secondary">Passed</Badge>}
                  {!currentLot.passed && !isResolved && isPlayerLeading && (
                    <Badge className="bg-success">You're leading</Badge>
                  )}
                  {!currentLot.passed && currentLot.soldToStableId && isResolved && (
                    <Badge variant="outline">
                      Sold —{" "}
                      {stables.find((s) => s.id === currentLot.soldToStableId)?.name ?? "NPC"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pedigree */}
                <div className="text-sm">
                  {horse.sireName && horse.damName && (
                    <p className="text-muted-foreground">
                      By <span className="font-medium text-cream">{horse.sireName}</span> ×{" "}
                      <span className="font-medium text-cream">{horse.damName}</span>
                    </p>
                  )}
                </div>

                {/* Physical */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
                  {horse.conformation && (
                    <div>
                      <span className="text-cream-muted">Conformation: </span>
                      {horse.conformation}
                    </div>
                  )}
                  {horse.temperament && (
                    <div>
                      <span className="text-cream-muted">Temperament: </span>
                      {horse.temperament}
                    </div>
                  )}
                  {horse.coatColor && (
                    <div>
                      <span className="text-cream-muted">Coat: </span>
                      {horse.coatColor}
                    </div>
                  )}
                  {horse.runningStyle && (
                    <div>
                      <span className="text-cream-muted">Style: </span>
                      {horse.runningStyle}
                    </div>
                  )}
                </div>

                {/* Stats (fog of war) */}
                {displayStats && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-cream-muted uppercase tracking-wide">
                      Stats
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
                      {displayStats.speed !== undefined ? (
                        <div>
                          <span className="text-cream-muted">Speed: </span>
                          {displayStats.speed}
                        </div>
                      ) : (
                        <div>
                          <span className="text-cream-muted">Speed: </span>
                          <span className="italic text-cream-muted">unknown</span>
                        </div>
                      )}
                      {displayStats.stamina !== undefined ? (
                        <div>
                          <span className="text-cream-muted">Stamina: </span>
                          {displayStats.stamina}
                        </div>
                      ) : (
                        <div>
                          <span className="text-cream-muted">Stamina: </span>
                          <span className="italic text-cream-muted">unknown</span>
                        </div>
                      )}
                      {displayStats.acceleration !== undefined ? (
                        <div>
                          <span className="text-cream-muted">Accel.: </span>
                          {displayStats.acceleration}
                        </div>
                      ) : (
                        <div>
                          <span className="text-cream-muted">Accel.: </span>
                          <span className="italic text-cream-muted">unknown</span>
                        </div>
                      )}
                      {displayStats.consistency !== undefined ? (
                        <div>
                          <span className="text-cream-muted">Consist.: </span>
                          {displayStats.consistency}
                        </div>
                      ) : (
                        <div>
                          <span className="text-cream-muted">Consist.: </span>
                          <span className="italic text-cream-muted">unknown</span>
                        </div>
                      )}
                    </div>
                    {displayStatsResult?.overallEstimate !== undefined && (
                      <p className="text-xs text-cream-muted tabular-nums">
                        OVR ~{displayStatsResult.overallEstimate} (estimated)
                      </p>
                    )}
                  </div>
                )}

                {/* Consignor */}
                {consignor && (
                  <p className="text-xs text-cream-muted">
                    {isPlayerConsigned
                      ? "Your commission will be deducted from proceeds."
                      : "Bid to acquire this horse for your stable."}
                  </p>
                )}
                {!consignor && !currentLot.consignorStableId && (
                  <p className="text-xs text-success font-medium">
                    Your consignment · {Math.round(CONSIGNMENT_COMMISSION * 100)}% commission
                  </p>
                )}
                <p className="text-cream-muted">
                  {isPlayerConsigned
                    ? "Consigned by you"
                    : consignor
                      ? `Consigned by ${consignor.name}`
                      : "Unknown consignor"}
                </p>

                {/* B3 — Withdraw Consignment button */}
                {isPlayerConsigned && !isResolved && !currentLot.withdrawn && (
                  <div className="pt-1">
                    {sale.day > day ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Withdraw Consignment
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw consignment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove <strong>{horse?.name ?? "this horse"}</strong> from{" "}
                              <strong>{sale.name}</strong>. You will not receive any proceeds. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep consignment</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                setLotIndex(0);
                                const result = withdrawConsignment(currentLot.horseId);
                                if (!result.ok) setMessage(result.reason);
                              }}
                            >
                              Withdraw
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled
                        title="Cannot withdraw after sale day"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Withdraw Consignment
                      </Button>
                    )}
                  </div>
                )}

                {/* Price */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cream-muted">Current price</span>
                    <p className="text-sm text-cream-muted mt-0.5 tabular-nums">
                      {currentPrice > 0 ? formatCurrency(currentPrice) : "No bids"}
                    </p>
                  </div>
                  {!isResolved && !currentLot.passed && (
                    <>
                      <div className="flex items-center justify-between text-sm text-cream-muted">
                        <span>Next bid</span>
                        <span className="tabular-nums">{formatCurrency(nextBid)}</span>
                      </div>

                      {/* Buy-now label on lot card (secondary, muted) */}
                      {currentLot.buyNowPrice !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-cream-muted">Buy now:</span>
                          <span className="tabular-nums text-cream-muted font-medium">
                            {formatCurrency(currentLot.buyNowPrice)}
                          </span>
                        </div>
                      )}

                      {/* D1 — Buy Now button + AlertDialog */}
                      {currentLot.buyNowPrice !== undefined && !isPlayerConsigned && (
                        <BuyNowDialog
                          horseName={horse?.name ?? "Horse"}
                          buyNowPrice={currentLot.buyNowPrice}
                          cash={cash}
                          onBuyNow={() => buyNow(sale!.id, currentLot.id)}
                          disabled={cash < currentLot.buyNowPrice}
                        />
                      )}

                      {/* Quick bid */}
                      <Button
                        className="w-full"
                        onClick={() => bid(nextBid)}
                        disabled={cash < nextBid}
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        Bid <span className="tabular-nums">{formatCurrency(nextBid)}</span>
                      </Button>

                      {/* Custom bid */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom bid amount"
                          value={bidInput}
                          onChange={(e) => setBidInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") bid(Number(bidInput.replace(/,/g, "")));
                          }}
                          className="tabular-nums"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => bid(Number(bidInput.replace(/,/g, "")))}
                        >
                          Bid
                        </Button>
                      </div>

                      {/* Max bid */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Max bid (auto-bid up to)"
                          value={maxBid}
                          onChange={(e) => setMaxBid(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleMaxBid();
                          }}
                          className="tabular-nums"
                        />
                        <Button variant="outline" onClick={handleMaxBid}>
                          Set Max
                        </Button>
                      </div>

                      {message && (
                        <p
                          className={cn(
                            "text-sm text-center",
                            message.includes("placed") ? "text-success" : "text-destructive",
                          )}
                        >
                          {message}
                        </p>
                      )}
                    </>
                  )}

                  {isResolved && currentLot.hammerPrice && !currentLot.passed && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-fame" />
                      <span className="tabular-nums">
                        Sold for <strong>{formatCurrency(currentLot.hammerPrice)}</strong>
                        {currentLot.soldToStableId
                          ? ` to ${stables.find((s) => s.id === currentLot.soldToStableId)?.name ?? "NPC"}`
                          : " to you"}
                        {isPlayerConsigned && (
                          <> (gross · net {formatCurrency(netProceeds(currentLot.hammerPrice))})</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : displayLots.length > 0 && currentLot && !horse ? (
            <Card>
              <CardContent className="p-6 text-center text-cream-muted text-sm">
                Horse data unavailable for this lot.
              </CardContent>
            </Card>
          ) : null}

          {/* Sale summary when resolved */}
          {isResolved && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sale Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm tabular-nums">
                <p>
                  Lots offered: <strong>{activeLots.length}</strong>
                </p>
                <p>
                  Sold:{" "}
                  <strong>{activeLots.filter((l) => !l.passed && l.hammerPrice).length}</strong>
                </p>
                <p>
                  Passed: <strong>{activeLots.filter((l) => l.passed).length}</strong>
                </p>
                {(() => {
                  const top = activeLots
                    .filter((l) => l.hammerPrice && !l.passed)
                    .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
                  if (!top) return null;
                  const topHorse = horses.find((h) => h.id === top.horseId);
                  return (
                    <p>
                      Top lot: <strong>{topHorse?.name ?? "Unknown"}</strong> — $
                      {formatCurrency(top.hammerPrice!)}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
