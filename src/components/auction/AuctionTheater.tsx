import { useEffect, useState, useRef } from "react";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaddleCard } from "./PaddleCard";
import { createAuctionRunner, nextBidAmount, type AuctionTickEvent, type ChantPhase } from "@/game/auctionRunner";
import { generateAuctioneerLine, type AuctioneerLine } from "@/services/auctioneerService";
import { createRng } from "@/game/rng";
import { getDisplayableStats } from "@/game/scouting";
import { HorsePortrait } from "@/components/HorsePortrait";
import { Pause, Play, FastForward, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuctionTheaterProps {
  saleId: string;
}

export function AuctionTheater({ saleId }: AuctionTheaterProps) {
  const game = useGame();
  const sale = game.auctions?.find((a) => a.id === saleId);
  const stables = game.npcStables;
  const horses = game.horses;

  const [isRunning, setIsRunning] = useState(false);
  const [autoWatch, setAutoWatch] = useState(false);
  const [customBid, setCustomBid] = useState("");
  const [runner, setRunner] = useState<ReturnType<typeof createAuctionRunner> | null>(null);
  const [currentLotIndex, setCurrentLotIndex] = useState(0);
  const [chantPhase, setChantPhase] = useState<ChantPhase>("open");
  const [currentBid, setCurrentBid] = useState(0);
  const [leadingBidder, setLeadingBidder] = useState<string | undefined>(undefined);
  const [chantLines, setChantLines] = useState<AuctioneerLine[]>([]);
  const [activePaddle, setActivePaddle] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  const timerRef = useRef<number | null>(null);
  const rngRef = useRef(createRng(Date.now()));

  // Initialize runner
  useEffect(() => {
    if (!sale) return;
    const newRunner = createAuctionRunner(sale, stables, horses, Date.now(), { liveMode: true });
    setRunner(newRunner);
    setCurrentLotIndex(newRunner.currentLotIndex());
  }, [sale, stables, horses]);

  // Auto-watch timer
  useEffect(() => {
    if (isRunning && autoWatch && runner && !done) {
      timerRef.current = window.setTimeout(() => {
        const result = runner.step();
        handleStepResult(result);
      }, 1500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, autoWatch, runner, done]);

  const handleStepResult = (result: { events: AuctionTickEvent[]; done: boolean }) => {
    const { events, done: stepDone } = result;
    const lotState = runner?.currentLot();

    // Commit results when done
    if (stepDone && runner) {
      const finalLots = runner.finalLots();
      const impacts = runner.finalImpacts({ day: game.day, phase: "live_auction" });
      game.commitAuctionResult(saleId, finalLots, impacts);
    }

    setCurrentLotIndex(runner?.currentLotIndex() ?? 0);
    if (lotState) {
      setCurrentBid(lotState.currentBid);
      setLeadingBidder(lotState.leadingBidder);
      setChantPhase(lotState.chant);
    }

    // Process events for chant lines and paddle activation
    const newLines: AuctioneerLine[] = [];
    for (const event of events) {
      const lot = sale?.lots.find((l) => l.id === event.lotId);
      const horse = lot ? horses.find((h) => h.id === lot.horseId) : undefined;
      const consignor = lot?.consignorStableId ? stables.find((s) => s.id === lot.consignorStableId) : undefined;
      const winner = event.type === "SOLD" && event.toStableId ? stables.find((s) => s.id === event.toStableId) : undefined;
      const scoutedStats = horse ? getDisplayableStats(horse, game.scoutReports, game.day) : null;
      const paddleNumber = event.type === "BID_RECEIVED" && event.stableId ? stables.findIndex((s) => s.id === event.stableId) + 1 : undefined;

      const ctx = {
        horse,
        consignor,
        winner,
        scoutedOverall: scoutedStats?.overallEstimate,
        paddleNumber,
        breezeSeconds: lot?.breezeSeconds,
      };

      const line = generateAuctioneerLine(event, ctx, rngRef.current);
      newLines.push(line);

      // Activate paddle on bid
      if (event.type === "BID_RECEIVED") {
        setActivePaddle(event.stableId);
        setTimeout(() => setActivePaddle(undefined), 1000);
      } else if (event.type === "BID_WAR") {
        // Flash all paddles in the bid war
        const firstBidder = event.stableIds[0];
        setActivePaddle(firstBidder);
        setTimeout(() => setActivePaddle(undefined), 1000);
      }
    }

    setChantLines((prev) => [...prev, ...newLines].slice(-20));
    setDone(stepDone);
    setIsRunning(!stepDone);
  };

  const handleStep = () => {
    if (!runner || done) return;
    const result = runner.step();
    handleStepResult(result);
  };

  const handleBid = (amount: number) => {
    if (!runner || done) return;
    const debitResult = game.debitForLiveBid(amount);
    if (!debitResult.ok) {
      alert(debitResult.reason);
      return;
    }
    const result = runner.step(amount);
    handleStepResult(result);
  };

  const handleCustomBid = () => {
    const amount = parseInt(customBid, 10);
    if (isNaN(amount) || amount <= currentBid) {
      alert("Bid must exceed current price");
      return;
    }
    handleBid(amount);
    setCustomBid("");
  };

  const handleQuickBid = () => {
    const nextBid = nextBidAmount(currentBid);
    handleBid(nextBid);
  };

  const handleSkipToResults = () => {
    if (!runner) return;
    const events = runner.runToCompletion();
    handleStepResult({ events, done: true });
    // Commit results
    const finalLots = runner.finalLots();
    const impacts = runner.finalImpacts({ day: game.day, phase: "live_auction" });
    game.commitAuctionResult(saleId, finalLots, impacts);
  };

  const handleToggleAutoWatch = () => {
    setAutoWatch(!autoWatch);
    setIsRunning(!autoWatch);
  };

  const lotState = runner?.currentLot();
  const currentLot = lotState?.lot;
  const currentHorse = lotState?.horse;
  const bidderStables = stables.filter((s) => s.isMajor);

  if (!sale || !runner) return null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{sale.name}</h2>
          <p className="text-sm text-muted-foreground">
            Lot {currentLotIndex + 1} of {sale.lots.filter((l) => !l.withdrawn).length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSkipToResults}>
            <SkipForward className="h-4 w-4 mr-1" />
            Skip to Results
          </Button>
          <Button
            variant={autoWatch ? "default" : "outline"}
            size="sm"
            onClick={handleToggleAutoWatch}
          >
            {autoWatch ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {autoWatch ? "Pause" : "Auto-Watch"}
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Current lot card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Lot</CardTitle>
          </CardHeader>
          <CardContent>
            {currentLot && currentHorse ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <HorsePortrait coatColor={currentHorse.coatColor} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{currentHorse.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentHorse.age}yo {currentHorse.gender} · {currentHorse.hemisphere}
                    </p>
                    {currentLot.breezeSeconds && (
                      <Badge variant="secondary" className="mt-1">
                        Breeze: {currentLot.breezeSeconds.toFixed(2)}s
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bidding info */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Bid:</span>
                    <span className="text-2xl font-bold tabular-nums">
                      ${currentBid.toLocaleString()}
                    </span>
                  </div>
                  {leadingBidder && (
                    <div className="text-sm text-muted-foreground">
                      Leading: {leadingBidder === undefined ? "You" : stables.find((s) => s.id === leadingBidder)?.name}
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span>Next bid:</span>
                    <span className="font-medium">${nextBidAmount(currentBid).toLocaleString()}</span>
                  </div>
                </div>

                {/* Action bar */}
                {!done && (
                  <div className="flex gap-2">
                    <Button onClick={handleQuickBid} disabled={done}>
                      Bid ${nextBidAmount(currentBid).toLocaleString()}
                    </Button>
                    <Input
                      type="number"
                      placeholder="Custom bid"
                      value={customBid}
                      onChange={(e) => setCustomBid(e.target.value)}
                      className="w-32"
                    />
                    <Button variant="outline" onClick={handleCustomBid} disabled={done || !customBid}>
                      Bid
                    </Button>
                    {!isRunning && (
                      <Button variant="ghost" onClick={handleStep} disabled={done}>
                        Next
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {done ? "Sale complete" : "No lot in ring"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Paddles + Chant */}
        <div className="space-y-4">
          {/* Paddle grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bidders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {bidderStables.slice(0, 9).map((stable, idx) => (
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

          {/* Auctioneer chant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Auctioneer
                {isRunning && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chantLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Waiting for sale to start...</p>
                ) : (
                  chantLines.map((line, idx) => (
                    <p
                      key={idx}
                      className={cn(
                        "text-sm",
                        line.isHighImpact ? "font-bold text-emerald-600" : "text-muted-foreground"
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
