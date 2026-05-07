// AuctionTheater — the live auction-ring scene.
//
// Mirrors the live-race UI: paced auctioneer chant, NPC bidder paddles that
// flash when they raise, a one-click Bid button, custom bid, max bid (proxy),
// pass, skip-to-results, and a post-sale celebration summary. Driven by
// `createAuctionRunner({ liveMode: true })` which guarantees parity with the
// offline path — same seed → same outcome.

import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from "react";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaddleCard } from "./PaddleCard";
import {
  createAuctionRunner,
  nextBidAmount,
  type AuctionTickEvent,
  type AuctionRunner,
} from "@/game/auctionRunner";
import { generateAuctioneerLine, type AuctioneerLine } from "@/services/auctioneerService";
import { createRng, hashStr } from "@/game/rng";
import { getDisplayableStats } from "@/game/scouting";
import { HorsePortrait } from "@/components/HorsePortrait";
import { Pause, Play, FastForward, Gavel, Trophy, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { commissionAmount, KIND_LABELS, netProceeds } from "@/game/auction";
import { useNavigate } from "@tanstack/react-router";

const TICK_MS = 1500;

interface AuctionTheaterProps {
  saleId: string;
}

/**
 * Pure-derived scoreboard — what the player has done so far in this sale.
 */
function useScoreboard(saleId: string) {
  const auctions = useGame((s) => s.auctions);
  const horses = useGame((s) => s.horses);
  return useMemo(() => {
    const sale = auctions?.find((a) => a.id === saleId);
    if (!sale) return null;
    let won = 0;
    let sold = 0;
    let spent = 0;
    let netReceived = 0;
    let topAcquisition: { name: string; price: number } | null = null;
    let topSale: { name: string; price: number } | null = null;
    for (const lot of sale.lots) {
      if (lot.passed || lot.withdrawn) continue;
      if (!lot.hammerPrice) continue;
      const horse = horses.find((h) => h.id === lot.horseId);
      const isPlayerWin = lot.consignorStableId !== undefined && lot.soldToStableId === undefined;
      const isPlayerSale = lot.consignorStableId === undefined;
      if (isPlayerWin) {
        won++;
        spent += lot.hammerPrice;
        if (!topAcquisition || lot.hammerPrice > topAcquisition.price) {
          topAcquisition = { name: horse?.name ?? "Lot", price: lot.hammerPrice };
        }
      }
      if (isPlayerSale) {
        sold++;
        netReceived += netProceeds(lot.hammerPrice);
        if (!topSale || lot.hammerPrice > topSale.price) {
          topSale = { name: horse?.name ?? "Lot", price: lot.hammerPrice };
        }
      }
    }
    return { won, sold, spent, netReceived, topAcquisition, topSale };
  }, [auctions, saleId, horses]);
}

export function AuctionTheater({ saleId }: AuctionTheaterProps) {
  const navigate = useNavigate();
  const sale = useGame((s) => s.auctions?.find((a) => a.id === saleId));
  const stables = useGame((s) => s.npcStables);
  const horses = useGame((s) => s.horses);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const debitForLiveBid = useGame((s) => s.debitForLiveBid);
  const commitAuctionResult = useGame((s) => s.commitAuctionResult);

  // Theater-local state
  const [autoWatch, setAutoWatch] = useState(true);
  const [paused, setPaused] = useState(false);
  const [customBid, setCustomBid] = useState("");
  const [maxBid, setMaxBid] = useState("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [chantLines, setChantLines] = useState<AuctioneerLine[]>([]);
  const [activePaddle, setActivePaddle] = useState<string | null>(null);
  const [hammerFlash, setHammerFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  // Persistent runner + RNG across renders.
  const runnerRef = useRef<AuctionRunner | null>(null);
  const rngRef = useRef(createRng(hashStr((sale?.id ?? "fallback") + ":theater")));
  const timerRef = useRef<number | null>(null);

  // Initialize runner once per sale.
  useEffect(() => {
    if (!sale) return;
    runnerRef.current = createAuctionRunner(
      sale,
      stables,
      horses,
      hashStr(sale.id),
      { liveMode: true }
    );
    setChantLines([]);
    setDone(false);
    setCommitted(false);
    forceTick();
  }, [sale?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lotState = runnerRef.current?.currentLot();
  const currentLot = lotState?.lot;
  const currentHorse = lotState?.horse;
  const currentBid = lotState?.currentBid ?? 0;
  const leadingBidder = lotState?.leadingBidder; // undefined = player, when chant not "open"
  const totalLots = sale?.lots.filter((l) => !l.withdrawn).length ?? 0;
  const lotIndex = runnerRef.current?.currentLotIndex() ?? 0;
  const playerIsLeading = !done && currentBid > 0 && leadingBidder === undefined && (lotState?.chant !== "open");

  // ---------------------------------------------------------------------------
  // Step machinery
  // ---------------------------------------------------------------------------

  const stepAndRender = useCallback((playerBid?: number) => {
    const runner = runnerRef.current;
    if (!runner || done) return;

    const result = runner.step(playerBid);

    // Generate chant lines from events.
    const newLines: AuctioneerLine[] = [];
    let flashStable: string | null = null;
    let sawHammer = false;
    for (const event of result.events) {
      const lot = sale?.lots.find((l) => l.id === event.lotId);
      const horse = lot ? horses.find((h) => h.id === lot.horseId) : undefined;
      const consignor = lot?.consignorStableId
        ? stables.find((s) => s.id === lot.consignorStableId)
        : undefined;
      const winner =
        event.type === "SOLD" && event.toStableId
          ? stables.find((s) => s.id === event.toStableId)
          : undefined;
      const scouted = horse ? getDisplayableStats(horse, scoutReports, day) : null;
      const paddleNumber =
        (event.type === "BID_RECEIVED" && event.stableId)
          ? Math.max(1, stables.findIndex((s) => s.id === event.stableId) + 1)
          : undefined;

      const line = generateAuctioneerLine(event, {
        horse,
        consignor,
        winner,
        scoutedOverall: scouted?.overallEstimate,
        paddleNumber,
        breezeSeconds: lot?.breezeSeconds,
      }, rngRef.current);
      newLines.push(line);

      if (event.type === "BID_RECEIVED" && event.stableId) flashStable = event.stableId;
      if (event.type === "SOLD" || event.type === "PASSED") sawHammer = true;
    }

    if (newLines.length > 0) {
      setChantLines((prev) => [...prev, ...newLines].slice(-30));
    }
    if (flashStable) {
      setActivePaddle(flashStable);
    }
    if (sawHammer) {
      setHammerFlash(true);
      setTimeout(() => setHammerFlash(false), 600);
    }
    setBidError(null);
    setDone(result.done);
    forceTick();
  }, [sale, horses, stables, scoutReports, day, done]);

  // Auto-watch tick loop.
  useEffect(() => {
    if (done || paused || !autoWatch || !runnerRef.current) return;
    timerRef.current = window.setTimeout(() => stepAndRender(), TICK_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [done, paused, autoWatch, chantLines.length, stepAndRender]);

  // Commit on completion (idempotent).
  useEffect(() => {
    if (!done || committed || !runnerRef.current || !sale) return;
    const finalLots = runnerRef.current.finalLots();
    const impacts = runnerRef.current.finalImpacts({ day, phase: "auction_theater" });
    commitAuctionResult(sale.id, finalLots, impacts);
    setCommitted(true);
  }, [done, committed, sale, day, commitAuctionResult]);

  // ---------------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------------

  const placeBid = useCallback((amount: number) => {
    if (!runnerRef.current || done) return;
    if (amount <= currentBid) {
      setBidError("Bid must exceed current price.");
      return;
    }
    const debit = debitForLiveBid(amount);
    if (!debit.ok) {
      setBidError(debit.reason);
      return;
    }
    setCustomBid("");
    setMaxBid("");
    stepAndRender(amount);
  }, [done, currentBid, debitForLiveBid, stepAndRender]);

  const onQuickBid = () => placeBid(nextBidAmount(currentBid));

  const onCustomBidSubmit = () => {
    const amount = Number(customBid.replace(/[\$,]/g, ""));
    if (!amount || isNaN(amount)) {
      setBidError("Enter a valid amount.");
      return;
    }
    placeBid(amount);
  };

  const onMaxBidSubmit = () => {
    const cap = Number(maxBid.replace(/[\$,]/g, ""));
    if (!cap || isNaN(cap)) {
      setBidError("Enter a valid max bid.");
      return;
    }
    // Proxy: bid the next increment now. (Future: re-bid up to cap each round.)
    const amt = Math.min(cap, nextBidAmount(currentBid));
    placeBid(amt);
  };

  const onPass = () => {
    // Player declines this lot. Step the runner without a player bid; if
    // nobody else raises, the chant advances toward the hammer.
    stepAndRender();
  };

  const onSkipToResults = () => {
    if (!runnerRef.current) return;
    runnerRef.current.runToCompletion();
    setDone(true);
    forceTick();
  };

  // Keyboard shortcut: Space → next-increment bid.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" && !done) {
        e.preventDefault();
        onQuickBid();
      } else if (e.key === "p" && !done) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, onQuickBid]);

  // ---------------------------------------------------------------------------
  // Scoreboard (derived from store after each commit; pre-commit shows zeros)
  // ---------------------------------------------------------------------------

  const scoreboard = useScoreboard(saleId);

  if (!sale) {
    return (
      <div className="p-8 text-center text-muted-foreground">Sale not found.</div>
    );
  }

  const bidderStables = stables.filter((s) => s.isMajor);
  const consignor = currentLot?.consignorStableId
    ? stables.find((s) => s.id === currentLot.consignorStableId)
    : null;
  const isPlayerConsignment = !consignor && currentLot && !currentLot.consignorStableId;
  const scouted = currentHorse ? getDisplayableStats(currentHorse, scoutReports, day) : null;

  // ---------------------------------------------------------------------------
  // Post-sale celebration
  // ---------------------------------------------------------------------------

  if (done && committed) {
    return (
      <PostSaleSummary
        sale={sale}
        scoreboard={scoreboard}
        onClose={() => navigate({ to: "/auction" })}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Live ring layout
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header — sale name, progress, controls */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{sale.name}</h1>
          <p className="text-sm text-muted-foreground">
            {KIND_LABELS[sale.kind] ?? sale.kind} · Lot {lotIndex + 1} of {totalLots}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!paused ? (
            <Button variant="outline" size="sm" onClick={() => setPaused(true)}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPaused(false)}>
              <Play className="h-4 w-4 mr-1" /> Resume
            </Button>
          )}
          <Button
            variant={autoWatch ? "secondary" : "outline"}
            size="sm"
            onClick={() => setAutoWatch((a) => !a)}
            title="Auto-advance the chant. Toggle off to step manually."
          >
            <Play className="h-4 w-4 mr-1" /> {autoWatch ? "Auto-advance" : "Manual"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkipToResults}>
            <FastForward className="h-4 w-4 mr-1" /> Skip
          </Button>
        </div>
      </div>

      {/* Scoreboard */}
      <ScoreboardStrip
        cash={cash}
        lotsRemaining={totalLots - lotIndex}
        scoreboard={scoreboard}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lot card */}
        <Card className={cn("lg:col-span-2 transition-all", hammerFlash && "ring-2 ring-warning")}>
          <CardContent className="p-4 space-y-4">
            {currentLot && currentHorse ? (
              <>
                <div className="flex items-start gap-3">
                  <HorsePortrait coatColor={currentHorse.coatColor} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">{currentHorse.name}</h2>
                      {currentLot.breezeSeconds && (
                        <Badge variant="secondary" className="tabular-nums">
                          Breeze {currentLot.breezeSeconds.toFixed(2)}s
                        </Badge>
                      )}
                      {currentHorse.blueHenStatus?.isBlueHen && (
                        <Badge variant="outline" className="border-warning text-warning">Blue-Hen</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentHorse.gender === "filly" || currentHorse.gender === "mare" ? "♀" : "♂"}{" "}
                      {currentHorse.gender.charAt(0).toUpperCase() + currentHorse.gender.slice(1)} ·
                      Age {currentHorse.age} · {currentHorse.hemisphere}
                    </p>
                    {currentHorse.sireName && currentHorse.damName && (
                      <p className="text-sm mt-1">
                        By <span className="font-medium">{currentHorse.sireName}</span> ×{" "}
                        <span className="font-medium">{currentHorse.damName}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {isPlayerConsignment ? (
                        <span className="text-success font-medium">Your consignment</span>
                      ) : consignor ? (
                        <>Consigned by <span className="font-medium">{consignor.name}</span></>
                      ) : null}
                    </p>
                  </div>
                </div>

                {/* Stats (fog of war) */}
                {scouted?.stats && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm tabular-nums border-t pt-2">
                    <StatRow label="Speed" value={scouted.stats.speed} />
                    <StatRow label="Stamina" value={scouted.stats.stamina} />
                    <StatRow label="Accel." value={scouted.stats.acceleration} />
                    <StatRow label="Consist." value={scouted.stats.consistency} />
                    {scouted.overallEstimate !== undefined && (
                      <p className="col-span-2 text-xs text-muted-foreground mt-1">
                        OVR ~{scouted.overallEstimate} (estimated)
                      </p>
                    )}
                  </div>
                )}

                {/* Bidding panel */}
                <div className="rounded-lg bg-muted/40 border p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Current bid</span>
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums transition-colors",
                        playerIsLeading && "text-success"
                      )}
                    >
                      {currentBid > 0 ? `$${currentBid.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  {currentBid > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Leader</span>
                      <span className={cn("font-medium", playerIsLeading && "text-success")}>
                        {playerIsLeading
                          ? "You"
                          : leadingBidder
                          ? stables.find((s) => s.id === leadingBidder)?.name ?? "—"
                          : "—"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Next required bid</span>
                    <span className="tabular-nums">${nextBidAmount(currentBid).toLocaleString()}</span>
                  </div>

                  {/* Action bar */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={onQuickBid}
                      disabled={done || playerIsLeading || cash < nextBidAmount(currentBid)}
                      className="flex-1 min-w-[140px]"
                      title="Hotkey: Space"
                    >
                      <Gavel className="h-4 w-4 mr-1.5" />
                      Bid ${nextBidAmount(currentBid).toLocaleString()}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onPass} disabled={done}>
                      <X className="h-4 w-4 mr-1" /> Pass
                    </Button>
                  </div>

                  {/* Custom + max bid row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Custom bid"
                        value={customBid}
                        onChange={(e) => setCustomBid(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onCustomBidSubmit(); }}
                        className="tabular-nums text-sm h-9"
                      />
                      <Button variant="secondary" size="sm" onClick={onCustomBidSubmit} disabled={done || !customBid}>
                        Bid
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Input
                        placeholder="Max bid"
                        value={maxBid}
                        onChange={(e) => setMaxBid(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onMaxBidSubmit(); }}
                        className="tabular-nums text-sm h-9"
                      />
                      <Button variant="outline" size="sm" onClick={onMaxBidSubmit} disabled={done || !maxBid}>
                        Set
                      </Button>
                    </div>
                  </div>

                  {bidError && (
                    <p className="text-xs text-destructive">{bidError}</p>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    Press <kbd className="px-1 rounded bg-muted text-foreground">Space</kbd> to bid the next increment ·{" "}
                    <kbd className="px-1 rounded bg-muted text-foreground">P</kbd> to pause
                  </p>
                </div>
              </>
            ) : done ? (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-warning" />
                <p>Sale concluded.</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">Loading next lot…</div>
            )}
          </CardContent>
        </Card>

        {/* Side column: paddles + chant */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-2 pb-1">
              <CardTitle className="text-sm">Bidders in the room</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="grid grid-cols-3 gap-1.5">
                {bidderStables.map((stable, idx) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-2 pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                Auctioneer
                {!paused && !done && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-success font-normal">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" /> Live
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {chantLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    "Welcome to {sale.name}. We'll get started momentarily…"
                  </p>
                ) : (
                  chantLines.map((line, idx) => (
                    <p
                      key={idx}
                      className={cn(
                        "text-xs leading-snug",
                        idx === chantLines.length - 1 && "animate-in fade-in slide-in-from-right-2 duration-200",
                        line.isHighImpact ? "font-bold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {line.text}
                    </p>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      {value !== undefined ? value : <span className="italic text-muted-foreground">—</span>}
    </div>
  );
}

function ScoreboardStrip({
  cash,
  lotsRemaining,
  scoreboard,
}: {
  cash: number;
  lotsRemaining: number;
  scoreboard: ReturnType<typeof useScoreboard>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <ScoreCell label="Cash" value={`$${cash.toLocaleString()}`} />
      <ScoreCell label="Lots remaining" value={String(lotsRemaining)} />
      <ScoreCell
        label="Acquired"
        value={scoreboard ? `${scoreboard.won} · $${scoreboard.spent.toLocaleString()}` : "—"}
      />
      <ScoreCell
        label="Sold"
        value={scoreboard ? `${scoreboard.sold} · net $${scoreboard.netReceived.toLocaleString()}` : "—"}
      />
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PostSaleSummary({
  sale,
  scoreboard,
  onClose,
}: {
  sale: import("@/game/types").AuctionSale;
  scoreboard: ReturnType<typeof useScoreboard>;
  onClose: () => void;
}) {
  const sb = scoreboard;
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <Trophy className="h-10 w-10 mx-auto text-warning" />
        <CardTitle className="text-2xl mt-1">{sale.name} — concluded</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sb && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SummaryStat label="Lots acquired" value={String(sb.won)} />
              <SummaryStat label="Total spent" value={`$${sb.spent.toLocaleString()}`} />
              <SummaryStat label="Lots sold" value={String(sb.sold)} />
              <SummaryStat
                label="Net received"
                value={`$${sb.netReceived.toLocaleString()}`}
                hint={sb.sold > 0 ? `after ${Math.round((commissionAmount(sb.netReceived / 0.94) / (sb.netReceived / 0.94)) * 100)}% commission` : undefined}
              />
            </div>
            {sb.topAcquisition && (
              <div className="rounded-lg border-l-4 border-l-success bg-success/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top acquisition</p>
                <p className="font-semibold">{sb.topAcquisition.name}</p>
                <p className="text-sm tabular-nums">${sb.topAcquisition.price.toLocaleString()}</p>
              </div>
            )}
            {sb.topSale && (
              <div className="rounded-lg border-l-4 border-l-warning bg-warning/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best sale</p>
                <p className="font-semibold">{sb.topSale.name}</p>
                <p className="text-sm tabular-nums">${sb.topSale.price.toLocaleString()}</p>
              </div>
            )}
          </>
        )}
        <Button className="w-full" onClick={onClose}>
          Return to Sales
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
