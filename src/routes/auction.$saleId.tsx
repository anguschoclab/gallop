import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { getDisplayableStats } from "@/game/scouting";
import { KIND_LABELS, netProceeds, CONSIGNMENT_COMMISSION } from "@/game/auction";
import { Gavel, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import type { AuctionLot } from "@/game/types";
import { cn } from "@/lib/utils";
import { HorsePortrait } from "@/components/HorsePortrait";
import { AuctionTheater } from "@/components/auction/AuctionTheater";

export const Route = createFileRoute("/auction/$saleId")({
  component: AuctionSalePage,
});

function AuctionSalePage() {
  const { saleId } = Route.useParams();
  const navigate = useNavigate();
  const auctions = useGame((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const stables = useGame((s) => s.npcStables);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const consignHorse = useGame((s) => s.consignHorse);
  const placeBookBid = useGame((s) => s.placeBookBid);

  const sale = auctions.find((a) => a.id === saleId);
  const [lotIndex, setLotIndex] = useState(0);
  const [bidInput, setBidInput] = useState("");
  const [maxBid, setMaxBid] = useState("");
  const [message, setMessage] = useState("");

  if (!sale) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Sale not found</h1>
        <Button variant="ghost" onClick={() => navigate({ to: "/auction" })}>← Back to Sales</Button>
      </div>
    );
  }

  const activeLots = sale.lots.filter((l) => !l.withdrawn);
  const currentLot: AuctionLot | undefined = activeLots[lotIndex];
  const horse = currentLot ? horses.find((h) => h.id === currentLot.horseId) : undefined;
  const consignor = currentLot?.consignorStableId ? stables.find((s) => s.id === currentLot.consignorStableId) : undefined;
  const displayStatsResult = horse ? getDisplayableStats(horse, scoutReports, day) : null;
  const displayStats = displayStatsResult?.stats ?? null;
  const currentPrice = currentLot?.hammerPrice ?? 0;
  const nextBid = Math.ceil((currentPrice * 1.05 + 200) / 100) * 100;
  const isPlayerLeading = currentLot && !currentLot.soldToStableId && currentLot.hammerPrice !== undefined;
  const isResolved = sale.resolved;
  const isSaleDay = sale.day === day;
  const isPlayerConsigned = currentLot && !currentLot.consignorStableId;

  function bid(amount: number) {
    if (!currentLot) return;
    if (amount <= currentPrice) { setMessage("Bid must exceed current price."); return; }
    if (amount > cash) { setMessage("Insufficient funds."); return; }
    const result = placeBookBid(sale!.id, currentLot.id, amount);
    if (result.ok) {
      setMessage(`Bid of $${amount.toLocaleString()} placed.`);
      setBidInput("");
      setMaxBid("");
    } else {
      setMessage(result.reason);
    }
  }

  function handleMaxBid() {
    const cap = Number(maxBid.replace(/,/g, ""));
    if (!cap || cap <= currentPrice) { setMessage("Max bid must exceed current price."); return; }
    bid(cap);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auction" })} className="mb-2 -ml-2">
            ← Sales
          </Button>
          <h1 className="text-2xl font-bold">{sale.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {gameCalendarDate(sale.day)} · {KIND_LABELS[sale.kind] ?? sale.kind}
            {isResolved && " · Resolved"}
          </p>
        </div>
        <Badge variant={isResolved ? "secondary" : "default"} className="mt-1">
          {isResolved ? "Completed" : "Open"}
        </Badge>
      </div>

      {/* Three-mode split */}
      {isSaleDay && !isResolved ? (
        <AuctionTheater saleId={saleId} />
      ) : activeLots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No lots in this sale.</CardContent>
        </Card>
      ) : (
        <>
          {/* Lot navigation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium tabular-nums">
              Lot {lotIndex + 1} of {activeLots.length}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setLotIndex((i) => Math.max(0, i - 1)); setMessage(""); }} disabled={lotIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setLotIndex((i) => Math.min(activeLots.length - 1, i + 1)); setMessage(""); }} disabled={lotIndex === activeLots.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lot card */}
          {currentLot && horse ? (
            <Card className={currentLot.passed ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <HorsePortrait coatColor={horse.coatColor} size="md" />
                    <div>
                      <CardTitle className="text-xl">{horse.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
                        {horse.gender === "colt" || horse.gender === "horse" ? "♂" : "♀"}{" "}
                        {horse.gender.charAt(0).toUpperCase() + horse.gender.slice(1)} · Age {horse.age}
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
                      Sold — {stables.find((s) => s.id === currentLot.soldToStableId)?.name ?? "NPC"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pedigree */}
                <div className="text-sm">
                  {horse.sireName && horse.damName && (
                    <p className="text-muted-foreground">
                      By <span className="font-medium text-foreground">{horse.sireName}</span> ×{" "}
                      <span className="font-medium text-foreground">{horse.damName}</span>
                    </p>
                  )}
                </div>

                {/* Physical */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
                  {horse.conformation && (
                    <div><span className="text-muted-foreground">Conformation: </span>{horse.conformation}</div>
                  )}
                  {horse.temperament && (
                    <div><span className="text-muted-foreground">Temperament: </span>{horse.temperament}</div>
                  )}
                  {horse.coatColor && (
                    <div><span className="text-muted-foreground">Coat: </span>{horse.coatColor}</div>
                  )}
                  {horse.runningStyle && (
                    <div><span className="text-muted-foreground">Style: </span>{horse.runningStyle}</div>
                  )}
                </div>

                {/* Stats (fog of war) */}
                {displayStats && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stats</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
                      {displayStats.speed !== undefined ? (
                        <div><span className="text-muted-foreground">Speed: </span>{displayStats.speed}</div>
                      ) : <div><span className="text-muted-foreground">Speed: </span><span className="italic text-muted-foreground">unknown</span></div>}
                      {displayStats.stamina !== undefined ? (
                        <div><span className="text-muted-foreground">Stamina: </span>{displayStats.stamina}</div>
                      ) : <div><span className="text-muted-foreground">Stamina: </span><span className="italic text-muted-foreground">unknown</span></div>}
                      {displayStats.acceleration !== undefined ? (
                        <div><span className="text-muted-foreground">Accel.: </span>{displayStats.acceleration}</div>
                      ) : <div><span className="text-muted-foreground">Accel.: </span><span className="italic text-muted-foreground">unknown</span></div>}
                      {displayStats.consistency !== undefined ? (
                        <div><span className="text-muted-foreground">Consist.: </span>{displayStats.consistency}</div>
                      ) : <div><span className="text-muted-foreground">Consist.: </span><span className="italic text-muted-foreground">unknown</span></div>}
                    </div>
                    {displayStatsResult?.overallEstimate !== undefined && (
                      <p className="text-xs text-muted-foreground tabular-nums">OVR ~{displayStatsResult.overallEstimate} (estimated)</p>
                    )}
                  </div>
                )}

                {/* Consignor */}
                {consignor && (
                  <p className="text-xs text-muted-foreground">
                    Consigned by <span className="font-medium">{consignor.name}</span>
                  </p>
                )}
                {!consignor && !currentLot.consignorStableId && (
                  <p className="text-xs text-success font-medium">
                    Your consignment · {Math.round(CONSIGNMENT_COMMISSION * 100)}% commission
                  </p>
                )}

                {/* Price */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current price</span>
                    <span className="text-lg font-bold tabular-nums">
                      {currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : "No bids"}
                    </span>
                  </div>
                  {!isResolved && !currentLot.passed && (
                    <>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Next bid</span>
                        <span className="tabular-nums">${nextBid.toLocaleString()}</span>
                      </div>

                      {/* Quick bid */}
                      <Button
                        className="w-full"
                        onClick={() => bid(nextBid)}
                        disabled={cash < nextBid}
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        Bid <span className="tabular-nums">${nextBid.toLocaleString()}</span>
                      </Button>

                      {/* Custom bid */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom bid amount"
                          value={bidInput}
                          onChange={(e) => setBidInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") bid(Number(bidInput.replace(/,/g, ""))); }}
                          className="tabular-nums"
                        />
                        <Button variant="secondary" onClick={() => bid(Number(bidInput.replace(/,/g, "")))}>
                          Bid
                        </Button>
                      </div>

                      {/* Max bid */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Max bid (auto-bid up to)"
                          value={maxBid}
                          onChange={(e) => setMaxBid(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleMaxBid(); }}
                          className="tabular-nums"
                        />
                        <Button variant="outline" onClick={handleMaxBid}>
                          Set Max
                        </Button>
                      </div>

                      {message && (
                        <p className={cn("text-sm text-center", message.includes("placed") ? "text-success" : "text-destructive")}>
                          {message}
                        </p>
                      )}
                    </>
                  )}

                  {isResolved && currentLot.hammerPrice && !currentLot.passed && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-fame" />
                      <span className="tabular-nums">
                        Sold for <strong>${currentLot.hammerPrice.toLocaleString()}</strong>
                        {currentLot.soldToStableId
                          ? ` to ${stables.find((s) => s.id === currentLot.soldToStableId)?.name ?? "NPC"}`
                          : " to you"}
                        {isPlayerConsigned && (
                          <>
                            {" "}(gross · net ${netProceeds(currentLot.hammerPrice).toLocaleString()})
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : currentLot && !horse ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
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
                <p>Lots offered: <strong>{activeLots.length}</strong></p>
                <p>Sold: <strong>{activeLots.filter((l) => !l.passed && l.hammerPrice).length}</strong></p>
                <p>Passed: <strong>{activeLots.filter((l) => l.passed).length}</strong></p>
                {(() => {
                  const top = activeLots.filter((l) => l.hammerPrice && !l.passed).sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
                  if (!top) return null;
                  const topHorse = horses.find((h) => h.id === top.horseId);
                  return <p>Top lot: <strong>{topHorse?.name ?? "Unknown"}</strong> — ${top.hammerPrice!.toLocaleString()}</p>;
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
