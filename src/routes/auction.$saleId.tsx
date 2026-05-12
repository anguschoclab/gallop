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
import { CONSIGNMENT_COMMISSION } from "@/game/constants/gameConstants";
import {
  Gavel,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Trash2,
  Search,
  ArrowLeft,
  ShieldCheck,
  FileText,
  TrendingUp,
  Activity,
  History,
  HardDrive,
  Info,
} from "lucide-react";
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
import { NumericValue } from "@/components/HorseBits";

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

  const [searchDraft, setSearchDraft] = useState(q ?? "");

  useEffect(() => {
    const id = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: searchDraft.trim() || undefined }),
      });
    }, 200);
    return () => clearTimeout(id);
  }, [searchDraft, navigate]);

  useEffect(() => {
    setSearchDraft(q ?? "");
  }, [q]);

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

  const onUpdateFilter = (
    update: Partial<AuctionBrowseSearch> | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
  ) => {
    navigate({
      search: (prev) => (typeof update === "function" ? update(prev) : { ...prev, ...update }),
    });
  };

  const onResetFilters = () => navigate({ search: () => ({}) });

  if (!sale) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
          SALE_NOT_FOUND
        </h1>
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/auction" })}
          className="text-gold uppercase font-mono text-xs tracking-widest hover:underline"
        >
          ← Return to Exchange
        </Button>
      </div>
    );
  }

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
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Sale Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <button
            onClick={() => navigate({ to: "/auction" })}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cream/30 hover:text-gold transition-colors mb-4"
          >
            <ArrowLeft className="h-3 w-3" /> Exchange Overview
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase">
              {sale.name}
            </h1>
            <Badge
              className={cn(
                "rounded-none font-black text-[10px] tracking-widest px-3 h-6",
                isResolved
                  ? "bg-slate-800 text-cream/40"
                  : "bg-gold text-slate-950 shadow-[0_0_15px_rgba(212,175,55,0.3)]",
              )}
            >
              {isResolved ? "RESOLVED" : "ACTIVE_FLOOR"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Market Class:{" "}
              <span className="text-gold-muted">{KIND_LABELS[sale.kind] ?? sale.kind}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Lot Count: <NumericValue value={activeLots.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Season Day: <NumericValue value={sale.day} />
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-cream/20 uppercase tracking-widest">
            Available_Capital
          </div>
          <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
            {formatCurrency(cash)}
          </div>
        </div>
      </div>

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
          {/* LEFT PILLAR: FILTER & CATALOG NAV */}
          <aside className="lg:col-span-4 space-y-8">
            {!isResolved && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Search className="h-3.5 w-3.5 text-gold/60" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                    Catalog Search
                  </h2>
                </div>
                <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40">
                  <CardContent className="p-5 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                      <Input
                        placeholder="Horse or sire name..."
                        className="h-10 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-gold/30"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                      />
                    </div>
                    <AuctionFilterBar
                      search={filters}
                      hasActiveFilters={hasActiveFilters}
                      onUpdateFilter={onUpdateFilter}
                      onReset={onResetFilters}
                    />
                  </CardContent>
                </Card>
              </section>
            )}

            {isResolved && (
              <PlayerConsignmentsPanel
                playerConsignedLots={playerConsignedLots}
                horses={horses}
                stables={stables}
              />
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <History className="h-3.5 w-3.5 text-cream/30" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                  Catalog Index
                </h2>
              </div>
              <div className="border border-white/5 bg-slate-900/40 shadow-xl max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-white/5">
                  {displayLots.map((lot, idx) => {
                    const lotHorse = horses.find((h) => h.id === lot.horseId);
                    const isActive = idx === lotIndex;
                    return (
                      <div
                        key={lot.id}
                        onClick={() => {
                          setLotIndex(idx);
                          setMessage("");
                        }}
                        className={cn(
                          "px-4 py-3 cursor-pointer transition-all flex items-center justify-between group",
                          isActive
                            ? "bg-gold/10 border-l-2 border-l-gold"
                            : "hover:bg-white/[0.02] border-l-2 border-l-transparent",
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-cream/20 group-hover:text-gold/40 transition-colors">
                              #{String(idx + 1).padStart(3, "0")}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-bold uppercase tracking-tight transition-colors",
                                isActive ? "text-gold" : "text-cream/60 group-hover:text-cream",
                              )}
                            >
                              {lotHorse?.name || "UNKNOWN_ASSET"}
                            </span>
                          </div>
                          <div className="text-[8px] font-mono text-cream/20 uppercase tracking-tighter">
                            {lotHorse ? `${ageLabel(lotHorse)} · ${lotHorse.gender}` : "NA"}
                          </div>
                        </div>
                        <div className="text-right">
                          {lot.hammerPrice && (
                            <div
                              className={cn(
                                "text-[10px] font-mono font-bold tabular-nums",
                                lot.passed ? "text-destructive/40" : "text-success/60",
                              )}
                            >
                              {formatCurrency(lot.hammerPrice)}
                            </div>
                          )}
                          {lot.passed && (
                            <span className="text-[8px] font-black uppercase text-destructive/60 tracking-widest leading-none">
                              PASSED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </aside>

          {/* RIGHT PILLAR: ACTIVE LOT DETAIL */}
          <main className="lg:col-span-8 space-y-8">
            {displayLots.length > 0 && currentLot && horse ? (
              <div className="space-y-8">
                {/* Lot Detail Plate */}
                <div className="bg-slate-900/60 border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold/40" />

                  <div className="bg-black/40 px-8 py-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-gold/10 border border-gold/20 p-2 min-w-[60px]">
                        <div className="text-[8px] font-black uppercase text-gold/40 tracking-tighter leading-none mb-1">
                          Lot_ID
                        </div>
                        <div className="text-xl font-black font-mono text-gold leading-none tabular-nums">
                          #{String(lotIndex + 1).padStart(3, "0")}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <h2 className="text-4xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-gold transition-colors">
                          {horse.name}
                        </h2>
                        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-cream/40">
                          <span>
                            {genderSymbol(horse.gender)} {horse.gender}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>Age {Math.floor(horse.age)}</span>
                          {horse.hemisphere === "Southern" && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-blue-400/60">S. Hemi.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentLot.passed && (
                        <Badge
                          variant="secondary"
                          className="rounded-none font-black text-[10px] tracking-widest h-8 px-4 bg-destructive/10 text-destructive border-destructive/20 uppercase"
                        >
                          PASSED_RESERVE
                        </Badge>
                      )}
                      {!currentLot.passed && !isResolved && isPlayerLeading && (
                        <Badge className="bg-success text-slate-950 rounded-none font-black text-[10px] tracking-widest h-8 px-4 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                          LEADING_BIDER
                        </Badge>
                      )}
                      {!currentLot.passed && currentLot.soldToStableId && isResolved && (
                        <div className="text-right">
                          <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest mb-1">
                            Acquired_By
                          </div>
                          <Badge
                            variant="outline"
                            className="border-gold/30 text-gold font-black text-[9px] uppercase tracking-widest h-6 rounded-none px-3 bg-gold/5"
                          >
                            {stables
                              .find((s) => s.id === currentLot.soldToStableId)
                              ?.name?.toUpperCase() ?? "NPC_ENTITY"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
                      {/* Portrait & Pedigree */}
                      <div className="md:col-span-5 space-y-6">
                        <div className="aspect-square bg-slate-950 border border-white/5 p-4 flex items-center justify-center relative shadow-inner">
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                          <HorsePortrait
                            id={horse.id}
                            coatColor={horse.coatColor}
                            markings={horse.markings}
                            gender={horse.gender}
                            appearance={horse.appearance}
                            size="lg"
                          />
                          <div className="absolute bottom-4 left-4 bg-black/80 border border-white/10 px-2 py-1 flex items-center gap-2 shadow-xl">
                            <ShieldCheck className="h-3 w-3 text-gold/40" />
                            <span className="text-[8px] font-mono text-gold-muted/60 uppercase tracking-widest">
                              Confirmed
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <TrendingUp className="h-3.5 w-3.5 text-pink-500/60" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                              Pedigree Analysis
                            </h3>
                          </div>
                          <Card className="bg-black/20 border-white/5 rounded-none border-l border-l-pink-500/30">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start gap-4">
                                <div className="space-y-0.5 flex-1">
                                  <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-widest">
                                    Sire Line
                                  </div>
                                  <div className="text-xs font-bold text-cream uppercase">
                                    {horse.sireName || "UNKNOWN"}
                                  </div>
                                </div>
                                <div className="space-y-0.5 flex-1 border-l border-white/5 pl-4">
                                  <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-widest">
                                    Dam Line
                                  </div>
                                  <div className="text-xs font-bold text-cream uppercase">
                                    {horse.damName || "UNKNOWN"}
                                  </div>
                                </div>
                              </div>
                              {horse.bruceLoweFamily && (
                                <div className="pt-2 border-t border-white/5">
                                  <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                                    {" "}
                                    Bruce Lowe Family
                                  </div>
                                  <div className="text-xs font-mono font-bold text-pink-400">
                                    FAMILY_0{horse.bruceLoweFamily}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Technical Specs & Bidding */}
                      <div className="md:col-span-7 space-y-8">
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <FileText className="h-3.5 w-3.5 text-gold/60" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                              Technical Specifications
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {(
                              ["conformation", "temperament", "coatColor", "runningStyle"] as const
                            ).map((spec) => (
                              <div key={spec} className="bg-black/20 p-3 border border-white/5">
                                <div className="text-[8px] font-black uppercase text-cream/20 tracking-tighter mb-1 leading-none">
                                  {spec.replace(/([A-Z])/g, "_$1").toUpperCase()}
                                </div>
                                <div className="text-xs font-mono font-bold text-cream/80 uppercase">
                                  {horse[spec]?.toString().replace("-", " ") || "DATA_LOCKED"}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Scouting Report */}
                          {displayStats && (
                            <div className="pt-4 border-t border-white/5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-[8px] font-black uppercase text-gold/40 tracking-widest">
                                  Scouting Report
                                </div>
                                {displayStatsResult?.overallEstimate && (
                                  <Badge
                                    variant="outline"
                                    className="border-gold/20 text-gold font-mono text-[9px] h-5 rounded-none px-2 uppercase"
                                  >
                                    Est_OVR: {displayStatsResult.overallEstimate}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {Object.entries(displayStats).map(([key, val]) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between border-b border-white/5 pb-1"
                                  >
                                    <span className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                                      {key}
                                    </span>
                                    <span className="text-xs font-mono font-black text-cream/60 tabular-nums">
                                      {val as string}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </section>

                        {/* Exchange Controls */}
                        {!isResolved && !currentLot.passed && (
                          <section className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <Activity className="h-3.5 w-3.5 text-success/60" />
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">
                                Exchange Terminal
                              </h3>
                            </div>
                            <div className="bg-black/40 border border-success/20 p-6 space-y-6">
                              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                                    Market Valuation
                                  </div>
                                  <div className="text-3xl font-black font-mono text-success tabular-nums tracking-tighter">
                                    {currentPrice > 0 ? formatCurrency(currentPrice) : "NO_OFFERS"}
                                  </div>
                                </div>
                                <div className="text-right space-y-0.5">
                                  <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                                    Required Step
                                  </div>
                                  <div className="text-sm font-black font-mono text-gold-muted tabular-nums tracking-tighter">
                                    +{formatCurrency(nextBid - currentPrice)}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex gap-2">
                                  <Button
                                    className="flex-1 h-14 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-xs shadow-lg group"
                                    onClick={() => bid(nextBid)}
                                    disabled={cash < nextBid}
                                  >
                                    <Gavel className="h-4 w-4 mr-3 group-hover:rotate-12 transition-transform" />
                                    SUBMIT_BID_{formatCurrency(nextBid)}
                                  </Button>
                                  {currentLot.buyNowPrice !== undefined && !isPlayerConsigned && (
                                    <BuyNowDialog
                                      horseName={horse?.name ?? "Horse"}
                                      buyNowPrice={currentLot.buyNowPrice}
                                      cash={cash}
                                      onBuyNow={() => buyNow(sale!.id, currentLot.id)}
                                      disabled={cash < currentLot.buyNowPrice}
                                    />
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[8px] uppercase font-black text-cream/20 tracking-widest px-1">
                                      Manual_Offer
                                    </label>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Amount..."
                                        value={bidInput}
                                        onChange={(e) => setBidInput(e.target.value)}
                                        className="h-10 bg-slate-950 border-white/5 text-xs font-mono uppercase tracking-tighter focus-visible:ring-success/30 rounded-none"
                                      />
                                      <Button
                                        variant="outline"
                                        className="h-10 px-4 border-white/10 text-cream/60 uppercase text-[9px] font-black tracking-widest rounded-none hover:bg-white/5"
                                        onClick={() => bid(Number(bidInput.replace(/,/g, "")))}
                                      >
                                        B_EXEC
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[8px] uppercase font-black text-cream/20 tracking-widest px-1">
                                      Auto_Cap_Limit
                                    </label>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Limit..."
                                        value={maxBid}
                                        onChange={(e) => setMaxBid(e.target.value)}
                                        className="h-10 bg-slate-950 border-white/5 text-xs font-mono uppercase tracking-tighter focus-visible:ring-gold/30 rounded-none"
                                      />
                                      <Button
                                        variant="outline"
                                        className="h-10 px-4 border-white/10 text-gold/60 uppercase text-[9px] font-black tracking-widest rounded-none hover:bg-gold/5"
                                        onClick={handleMaxBid}
                                      >
                                        S_MAX
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {message && (
                                <div
                                  className={cn(
                                    "p-3 text-center font-mono text-[10px] uppercase font-black tracking-widest border-t border-white/5",
                                    message.includes("placed")
                                      ? "text-success bg-success/5"
                                      : "text-destructive bg-destructive/5",
                                  )}
                                >
                                  {message}
                                </div>
                              )}
                            </div>
                            <p className="text-[8px] text-cream/20 uppercase italic text-center tracking-widest">
                              Terminal secured via central exchange authority. All bids binding.
                            </p>
                          </section>
                        )}

                        {isResolved && currentLot.hammerPrice && !currentLot.passed && (
                          <div className="p-6 bg-gold/5 border-2 border-double border-gold/20 text-center space-y-2">
                            <div className="text-[9px] font-black uppercase text-gold tracking-[0.4em]">
                              Transaction_Resolution
                            </div>
                            <div className="text-2xl font-black font-mono text-cream tabular-nums tracking-tighter">
                              {formatCurrency(currentLot.hammerPrice)}
                            </div>
                            <div className="text-[10px] font-mono text-gold-muted uppercase tracking-widest">
                              Acquired By:{" "}
                              {currentLot.soldToStableId
                                ? (stables
                                    .find((s) => s.id === currentLot.soldToStableId)
                                    ?.name?.toUpperCase() ?? "NPC_ENTITY")
                                : "PLAYER_STABLE"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consignment Withdrawal Access */}
                {isPlayerConsigned && !isResolved && !currentLot.withdrawn && (
                  <Card className="bg-slate-900/40 border-destructive/20 rounded-none shadow-xl border-t-2 border-t-destructive/40">
                    <CardContent className="p-6 flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-destructive uppercase tracking-widest flex items-center gap-2">
                          <Info className="h-3 w-3" /> Withdrawal protocol active
                        </div>
                        <p className="text-[10px] font-mono text-cream/30 uppercase tracking-tighter">
                          Emergency decommissioning of asset from public catalog.
                        </p>
                      </div>
                      {sale.day > day ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-none"
                            >
                              DECOMMISSION_ASSET
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-950 border-destructive/30 rounded-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-destructive uppercase font-black tracking-widest">
                                Confirm Withdrawal
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-cream/60 font-mono text-xs uppercase tracking-tighter">
                                Removal of <strong>{horse.name}</strong> from catalog. No
                                transaction proceeds will be generated.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none font-black text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90 rounded-none font-black text-[10px] uppercase tracking-widest"
                                onClick={() => {
                                  setLotIndex(0);
                                  const result = withdrawConsignment(currentLot.horseId);
                                  if (!result.ok) setMessage(result.reason);
                                }}
                              >
                                EXEC_WITHDRAWAL
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          disabled
                          variant="destructive"
                          className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-none opacity-20"
                        >
                          WITHDRAWAL_WINDOW_CLOSED
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : displayLots.length > 0 && currentLot && !horse ? (
              <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
                <hardDrive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
                <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                  Data Unavailable
                </p>
                <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                  Central registry cannot identify lot data.
                </p>
              </div>
            ) : null}

            {/* Resolved Sale Summary */}
            {isResolved && (
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-t-2 border-t-gold/40">
                <CardHeader className="bg-black/20 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-gold-muted/60">
                    Sale Exchange Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1">
                      <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
                        Total Lots
                      </div>
                      <div className="text-xl font-black font-mono text-cream tabular-nums">
                        {activeLots.length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
                        Lots Sold
                      </div>
                      <div className="text-xl font-black font-mono text-success tabular-nums">
                        {activeLots.filter((l) => !l.passed && l.hammerPrice).length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
                        Reserve Passed
                      </div>
                      <div className="text-xl font-black font-mono text-destructive/60 tabular-nums">
                        {activeLots.filter((l) => l.passed).length}
                      </div>
                    </div>
                    {(() => {
                      const top = activeLots
                        .filter((l) => l.hammerPrice && !l.passed)
                        .sort((a, b) => (b.hammerPrice ?? 0) - (a.hammerPrice ?? 0))[0];
                      if (!top) return null;
                      const topHorse = horses.find((h) => h.id === top.horseId);
                      return (
                        <div className="space-y-1">
                          <div className="text-[9px] font-black uppercase text-gold/40 tracking-widest">
                            Top Valuation
                          </div>
                          <div className="text-xl font-black font-mono text-gold-bright tabular-nums">
                            {formatCurrency(top.hammerPrice!)}
                          </div>
                          <div className="text-[8px] font-mono text-gold-muted/40 uppercase tracking-tighter truncate">
                            {topHorse?.name}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function ageLabel(horse: Horse): string {
  if (horse.age === 0) return "Weanling";
  if (horse.age === 1) return "Yearling";
  if (horse.age === 2) return "2YO";
  if (horse.gender === "mare") return `Broodmare (${Math.floor(horse.age)})`;
  return `${Math.floor(horse.age)}YO`;
}

import React from "react";
