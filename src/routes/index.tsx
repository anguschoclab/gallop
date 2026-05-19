import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { overall, NumericValue, HorseBit } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { NewsContent } from "@/components/narrative/NewsContent";
import {
  Trophy,
  Calendar,
  TrendingUp,
  Newspaper,
  Building2,
  Users,
  Gavel,
  Heart,
  ChevronRight,
  Activity,
  AlertCircle,
  Briefcase,
  Globe,
  LayoutGrid,
  Zap,
  Store,
  Bell,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReputationBadge } from "@/components/ReputationBadge";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const {
    day,
    cash,
    horses,
    races,
    log,
    awards,
    reputation,
    news,
    pregnancies,
    jockeys,
    facilities,
    auctions,
    hiredStaff,
    syndicates,
    npcStables,
    npcAIManager,
    inbox,
    markMessageRead,
  } = useGame();

  const ownedHorses = horses.filter((h) => h.owned);
  const activeHorses = ownedHorses.filter((h) => h.lifecycleStatus === "active");
  const lowEnergyHorses = activeHorses.filter((h) => h.energy < 40);

  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 8);

  const nextOwnedRace = upcoming.find((r) => r.entries.some((e) => e.owned));
  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];
  const playerAwards = awards?.filter((a) => !a.stableId) ?? [];

  const recentReputationEvents = reputation?.events?.slice(-3).reverse() ?? [];

  const urgentMessages = (inbox || [])
    .filter((m) => !m.readAt && m.priority !== "info")
    .sort((a, b) => b.day - a.day)
    .slice(0, 3);

  // Calculate top rivals for Key Rivals widget
  const topRivals = npcStables
    .map((stable) => ({
      stable,
      friction: npcAIManager?.stableStates?.[stable.id]?.friction ?? 0,
    }))
    .filter((r) => r.friction >= 40)
    .sort((a, b) => b.friction - a.friction)
    .slice(0, 3);

  // Helper functions for rivalry display
  const getRivalryStatusLabel = (friction: number) => {
    if (friction >= 80) return "Hostile";
    if (friction >= 60) return "Rival";
    if (friction >= 40) return "Competitive";
    return "Neutral";
  };

  const getRivalryBadgeColor = (friction: number) => {
    if (friction >= 80) return "bg-destructive text-slate-950";
    if (friction >= 60) return "bg-orange-500 text-slate-950";
    if (friction >= 40) return "bg-yellow-500 text-slate-950";
    return "bg-slate-700 text-cream";
  };

  // Calculate head-to-head record by scanning race history
  const calculateHeadToHead = (stableId: string) => {
    const thirtyDaysAgo = day - 30;
    let wins = 0;
    let losses = 0;

    // Scan player-owned horses' race history
    ownedHorses.forEach((horse) => {
      horse.raceHistory
        .filter((r) => r.day >= thirtyDaysAgo)
        .forEach((raceResult) => {
          // Find the race to check if rival had entries
          const race = races.find((r) => r.id === raceResult.raceId);
          if (race) {
            // Check if rival stable had entries in this race
            const hadRivalEntry = race.entries.some((e) => e.stableId === stableId);
            if (hadRivalEntry) {
              // Player horse vs rival horse
              if (raceResult.position === 1) {
                wins++;
              } else {
                losses++;
              }
            }
          }
        });
    });

    return { wins, losses };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* --- HEADER & STATUS BAR --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)] flex items-center gap-3">
            Command Center
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-gold/30 text-gold bg-gold/5 font-mono tracking-[0.2em] text-[10px] uppercase h-5"
            >
              {gameCalendarDate(day)}
            </Badge>
            <ReputationBadge />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {nextOwnedRace && (
            <Badge className="bg-fame text-slate-950 gap-1.5 py-1 font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              <Zap className="h-3 w-3 fill-current" />
              Next Race: D{nextOwnedRace.day}
            </Badge>
          )}
          {lowEnergyHorses.length > 0 && (
            <Badge
              variant="destructive"
              className="gap-1.5 animate-pulse py-1 font-bold uppercase tracking-tighter"
            >
              <AlertCircle className="h-3 w-3" />
              {lowEnergyHorses.length} Fatigued
            </Badge>
          )}
          {activeAuctions.length > 0 && (
            <Link to="/auction">
              <Badge className="bg-success text-slate-950 gap-1.5 py-1 font-bold uppercase tracking-tighter hover:opacity-90 transition-opacity">
                <Gavel className="h-3 w-3" />
                {activeAuctions.length} Sales Open
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* --- QUICK ACTION CENTER --- */}
      {urgentMessages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {urgentMessages.map((msg) => (
            <Card
              key={msg.id}
              className={cn(
                "bg-t800 border-l-4 transition-all hover:bg-t750 cursor-pointer group",
                msg.priority === "urgent" ? "border-l-red-500" : "border-l-gold",
              )}
              onClick={() => {
                if (msg.cta) {
                  const routePath = msg.cta.route.replace(
                    /\$(\w+)/g,
                    (_, key) => msg.cta?.params?.[key] || "",
                  );
                  navigate({ to: routePath as any });
                  markMessageRead(msg.id);
                } else {
                  navigate({ to: "/inbox" });
                }
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-full shrink-0",
                    msg.priority === "urgent"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gold/10 text-gold",
                  )}
                >
                  {msg.priority === "urgent" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-bold text-cream truncate">{msg.title}</h3>
                  <p className="text-xs text-cream-muted line-clamp-2">{msg.body}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-cream-muted ml-auto shrink-0 group-hover:text-gold transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* --- TOP ROW: SITUATION REPORT --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* The Gallop Gazette - Main Headline */}
        <Card className="xl:col-span-8 border-gold bg-[#f4f1ea] text-[#2c2c2c] overflow-hidden shadow-2xl ring-1 ring-gold/20 group">
          <CardHeader className="py-3 px-6 border-b-2 border-double border-[#2c2c2c] flex flex-row items-center justify-between bg-[#ece8df]">
            <div className="flex items-center gap-3">
              <Newspaper className="h-5 w-5 animate-in fade-in slide-in-from-left duration-500" />
              <CardTitle className="text-2xl font-black uppercase tracking-tighter font-[family-name:var(--font-display)] pt-1">
                The Gallop Gazette
              </CardTitle>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest border-l border-[#2c2c2c] pl-3 h-full tabular-nums">
              Edition {day}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {news && news.length > 0 ? (
                news.slice(0, 2).map((item, i) => (
                  <div
                    key={item.id}
                    className={cn(
                      "space-y-2",
                      i === 0 &&
                        "md:after:content-[''] md:after:absolute md:after:left-1/2 md:after:top-0 md:after:bottom-0 md:after:w-[1px] md:after:bg-[#d3d3d3] md:pr-4",
                    )}
                  >
                    <Badge className="bg-[#2c2c2c] text-white rounded-none text-[9px] font-bold h-4 px-1.5 uppercase tracking-widest">
                      {item.category}
                    </Badge>
                    <h3
                      className={cn(
                        "font-extrabold leading-[1.05] tracking-tighter text-[#1a1a1a] font-[family-name:var(--font-display)] group-hover:text-gold-dark transition-colors",
                        item.importance === "high" ? "text-2xl" : "text-xl",
                      )}
                    >
                      <NewsContent
                        text={item.headline}
                        links={item.entityLinks}
                        linkClassName="text-[#1a1a1a] hover:text-gold-dark border-b border-dotted border-[#1a1a1a]/40"
                      />
                    </h3>
                    <p className="text-sm line-clamp-3 leading-relaxed opacity-90 font-serif italic text-[#333]">
                      <NewsContent
                        text={item.body}
                        links={item.entityLinks}
                        linkClassName="text-[#333] hover:text-gold-dark border-b border-dotted border-[#333]/40"
                      />
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-sm italic opacity-40 font-serif uppercase tracking-widest">
                  No headlines in this morning's wire.
                </div>
              )}
            </div>
            <div className="mt-6 pt-3 border-t border-[#d3d3d3] flex justify-between items-center">
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                Global Racing Network • AP Wire
              </div>
              <Link
                to="/gazette"
                className="text-xs font-black uppercase hover:underline flex items-center gap-1 group/link"
              >
                Full Coverage{" "}
                <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Operational Ticker */}
        <Card className="xl:col-span-4 border-gold-muted bg-slate-900/60 backdrop-blur-xl shadow-inner border-l-4 border-l-gold">
          <CardHeader className="pb-2 border-b border-white/5 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-muted flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Operations Ticker
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 p-3 border border-white/5 rounded shadow-sm">
                <div className="text-[9px] text-cream-muted uppercase font-bold tracking-widest mb-1 opacity-60">
                  Liquidity
                </div>
                <div className="text-xl font-bold text-success font-mono tabular-nums leading-none tracking-tighter">
                  {formatCurrency(cash)}
                </div>
              </div>
              <div className="bg-black/40 p-3 border border-white/5 rounded shadow-sm">
                <div className="text-[9px] text-cream-muted uppercase font-bold tracking-widest mb-1 opacity-60">
                  Roster
                </div>
                <div className="text-xl font-bold text-cream font-mono leading-none tracking-tighter flex items-baseline gap-1">
                  {activeHorses.length}{" "}
                  <span className="text-[10px] text-cream-muted font-normal uppercase">Active</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-gold-muted/40 px-1">
                <span>Infrastructure Readiness</span>
                <span>Load</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-cream/80 flex items-center gap-2">
                      <Heart className="h-3 w-3 text-pink-500/70" />
                      Mating
                    </span>
                    <span className="text-cream font-bold tabular-nums">
                      {pregnancies?.length ?? 0}{" "}
                      <span className="opacity-40 font-normal">/ 10</span>
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500/50 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (pregnancies?.length ?? 0) * 10)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-cream/80 flex items-center gap-2">
                      <Briefcase className="h-3 w-3 text-blue-400/70" />
                      Staffing
                    </span>
                    <span className="text-cream font-bold tabular-nums">
                      {hiredStaff?.length ?? 0} <span className="opacity-40 font-normal">/ 12</span>
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400/50 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (hiredStaff?.length ?? 0) * 8.3)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-cream/80 flex items-center gap-2">
                      <Zap className="h-3 w-3 text-success/70" />
                      Syndicates
                    </span>
                    <span className="text-cream font-bold tabular-nums">
                      {Array.isArray(syndicates)
                        ? syndicates.filter((s: any) => s.ownerId === "player").length
                        : 0}
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success/50 transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, (Array.isArray(syndicates) ? syndicates.filter((s: any) => s.ownerId === "player").length : 0) * 20)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- MAIN PILLARS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KEY RIVALS WIDGET */}
        <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center border border-destructive/20 group-hover:bg-destructive/20 transition-colors">
                <Zap className="h-4 w-4 text-destructive" />
              </div>
              <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
                Key Rivals
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {topRivals.length > 0 ? (
              <div className="space-y-3">
                {topRivals.map((rival) => {
                  const headToHead = calculateHeadToHead(rival.stable.id);
                  return (
                    <div key={rival.stable.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cream/80">{rival.stable.name}</span>
                        <Badge className={getRivalryBadgeColor(rival.friction)}>
                          {getRivalryStatusLabel(rival.friction)}
                        </Badge>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive/60 transition-all"
                          style={{ width: `${(rival.friction / 100) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-cream/40">
                        <span>
                          Head-to-Head: {headToHead.wins}-{headToHead.losses}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-cream/30 italic">
                No bitter rivals yet — keep winning.
              </div>
            )}
          </CardContent>
        </Card>

        {/* PILLAR 1: HEADQUARTERS */}
        <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:bg-gold/20 transition-colors">
                <Building2 className="h-4 w-4 text-gold" />
              </div>
              <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
                H.Q. Ops
              </CardTitle>
            </div>
            <Link to="/financial-report">
              <Button
                aria-label="Go to H.Q. Ops financial report"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-cream-muted hover:text-gold group-hover:translate-x-0.5 transition-transform"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted/60 mb-2 px-1 flex justify-between">
                <span>Facility Health</span>
                <span>Rank</span>
              </div>
              <div className="space-y-2">
                {facilities &&
                  Object.entries(facilities)
                    .slice(0, 3)
                    .map(([key, f]: [string, any]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs bg-black/20 p-2 border border-white/5 rounded hover:bg-black/40 transition-colors"
                      >
                        <span className="text-cream/80 font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <Badge className="bg-gold-subtle text-gold text-[10px] h-4 font-bold border border-gold/20">
                          LVL {f?.rank ?? 1}
                        </Badge>
                      </div>
                    ))}
              </div>

              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted/60 mb-2 px-1">
                  Reputation Ledger
                </div>
                <div className="space-y-1.5">
                  {recentReputationEvents.map((e, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-[11px] border-b border-white/5 pb-1.5 last:border-0"
                    >
                      <span className="text-cream/60 truncate max-w-[140px] italic">
                        "{e.description}"
                      </span>
                      <span
                        className={cn(
                          "font-mono font-black",
                          e.amount > 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {e.amount > 0 ? "+" : ""}
                        {e.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
              <Link to="/facilities" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-gold/20 hover:bg-gold/10 text-gold-muted"
                >
                  Manage Horses
                </Button>
              </Link>
              <Link to="/settings" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-white/10 hover:bg-white/5 text-cream/40"
                >
                  Configuration
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* PILLAR 2: MY STABLE */}
        <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300 shadow-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-blue-400/10 flex items-center justify-center border border-blue-400/20 group-hover:bg-blue-400/20 transition-colors">
                <LayoutGrid className="h-4 w-4 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
                Stable & Roster
              </CardTitle>
            </div>
            <Link to="/stable">
              <Button
                aria-label="Go to Stable & Roster"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-cream-muted hover:text-blue-400 group-hover:translate-x-0.5 transition-transform"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/60 mb-2 px-1 flex justify-between">
                <span>Top Stable Stars</span>
                <span>Rating</span>
              </div>
              <div className="space-y-2">
                {activeHorses
                  .slice()
                  .sort((a, b) => overall(b) - overall(a))
                  .slice(0, 3)
                  .map((h) => (
                    <Link
                      key={h.id}
                      to="/stable/$horseId"
                      params={{ horseId: h.id }}
                      className="block group/item"
                    >
                      <div className="flex items-center justify-between p-2 rounded bg-white/[0.03] border border-white/5 hover:border-blue-400/30 hover:bg-blue-400/5 transition-all">
                        <HorseBit horse={h} />
                        <div className="flex items-center gap-3">
                          <NumericValue
                            value={overall(h)}
                            className="text-xs font-bold text-cream-muted group-hover/item:text-blue-400 transition-colors"
                          />
                          <Badge className="bg-black/40 text-cream text-[9px] h-4 px-1.5 font-mono border border-white/5">
                            E{h.energy}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>

              <div className="pt-2 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/60 mb-1 px-1 flex justify-between items-center">
                  <span>Personnel Brief</span>
                  <Link to="/jockeys" className="text-[9px] hover:text-blue-400 underline">
                    Roster
                  </Link>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-blue-400/60" />
                    <span className="text-cream/70 font-medium">Active Jockeys</span>
                  </div>
                  <span className="font-mono font-bold text-cream tabular-nums">
                    {jockeys?.filter((j) => j.stableId === "player").length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3 text-blue-400/60" />
                    <span className="text-cream/70 font-medium">Support Staff</span>
                  </div>
                  <span className="font-mono font-bold text-cream tabular-nums">
                    {hiredStaff?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
              <Link to="/horse-gallery" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-blue-400/20 hover:bg-blue-400/10 text-blue-400/70"
                >
                  Horse Gallery
                </Button>
              </Link>
              <Link to="/breeding" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-pink-400/20 hover:bg-pink-400/10 text-pink-400/70"
                >
                  Breeding Ops
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* PILLAR 3: THE WORLD */}
        <Card className="border-gold-muted flex flex-col bg-slate-900/20 group hover:border-gold/40 transition-all duration-300">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-success/10 flex items-center justify-center border border-success/20 group-hover:bg-success/20 transition-colors">
                <Globe className="h-4 w-4 text-success" />
              </div>
              <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
                The Circuit
              </CardTitle>
            </div>
            <Link
              to="/races"
              search={{
                grade: "all",
                country: "all",
                surface: "all",
                track: "all",
                owned: "all",
                q: "",
              }}
            >
              <Button
                aria-label="Go to The Circuit races"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-cream-muted hover:text-success group-hover:translate-x-0.5 transition-transform"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60 mb-2 px-1 flex justify-between">
                <span>Upcoming Races</span>
                <span>D / P</span>
              </div>
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5 hover:bg-black/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] font-bold text-cream truncate">{r.name}</div>
                      <div className="text-[9px] text-cream-muted uppercase font-mono tracking-tighter opacity-60">
                        {r.distance}m · {r.raceClass}
                      </div>
                    </div>
                    {r.entries.some((e) => e.owned) ? (
                      <Badge className="bg-success text-slate-950 text-[8px] h-4 font-black px-1 border-none shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                        ENTERED
                      </Badge>
                    ) : (
                      <div className="text-right">
                        <div className="text-[10px] font-mono font-bold text-cream">D{r.day}</div>
                        <NumericValue
                          value={formatCurrency(r.purse)}
                          className="text-[9px] font-bold text-success/70"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60 mb-1 px-1 flex justify-between items-center">
                  <span>Global Markets</span>
                  <Link to="/stallions" className="text-[9px] hover:text-success underline">
                    Sire Watch
                  </Link>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-2">
                    <Store className="h-3 w-3 text-success/60" />
                    <span className="text-cream/70 font-medium">Daily Market</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 border-success/20 text-success uppercase font-bold tracking-widest"
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-3 w-3 text-success/60" />
                    <span className="text-cream/70 font-medium">Public Auctions</span>
                  </div>
                  <span className="font-mono font-bold text-cream tabular-nums">
                    {activeAuctions.length}{" "}
                    <span className="text-[9px] text-cream/40 font-normal uppercase ml-1">
                      Open
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4 mt-auto border-t border-white/5">
              <Link to="/market" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-success/20 hover:bg-success/10 text-success/70"
                >
                  Claiming Market
                </Button>
              </Link>
              <Link to="/auction" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-widest border-white/10 hover:bg-white/5 text-cream/40"
                >
                  Auction Block
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- BOTTOM ROW: LOGS & TROPHIES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* News Feed */}
        <Card className="lg:col-span-8 border-gold-muted bg-slate-900/40 border-t-2 border-t-gold/40">
          <CardHeader className="py-3 border-b border-white/5 flex flex-row items-center justify-between bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.4em] text-cream-muted">
              News Feed
            </CardTitle>
            <Activity className="h-3 w-3 text-cream-muted/40 animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {log.length > 0 ? (
                log.slice(0, 15).map((l, i) => (
                  <div
                    key={i}
                    className="px-6 py-3 flex items-start gap-5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="text-[9px] font-mono text-gold/40 group-hover:text-gold transition-colors leading-none uppercase tracking-tighter">
                        Day
                      </span>
                      <span className="text-xs font-mono font-bold text-gold/60 group-hover:text-gold transition-colors tabular-nums leading-tight">
                        {String(l.day).padStart(3, "0")}
                      </span>
                    </div>
                    <span className="text-sm text-cream/80 font-[family-name:var(--font-body)] leading-relaxed flex-1 pt-0.5">
                      {l.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-cream-muted italic opacity-40">
                  No activity recorded on current frequency.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trophy Case Summary */}
        <Card className="lg:col-span-4 border-gold-muted bg-slate-900/40 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
            <Trophy className="h-32 w-32 rotate-12" />
          </div>
          <CardHeader className="py-3 border-b border-white/5 bg-black/20 relative z-10">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.4em] text-cream-muted">
              Legacy & Awards
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 relative z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-around px-2">
                <div className="text-center space-y-1 group cursor-default">
                  <div className="text-[9px] text-cream-muted uppercase font-bold tracking-widest opacity-60">
                    G1 Victories
                  </div>
                  <div className="text-3xl font-bold text-fame font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                    {awards?.filter((a: any) => (a as any).grade === "G1").length ?? 0}
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-white/10" />
                <div className="text-center space-y-1 group cursor-default">
                  <div className="text-[9px] text-cream-muted uppercase font-bold tracking-widest opacity-60">
                    Stable Awards
                  </div>
                  <div className="text-3xl font-bold text-gold font-mono leading-none tracking-tighter group-hover:scale-110 transition-transform">
                    {playerAwards.length}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-5 bg-gold/5 border border-gold/10 rounded text-center space-y-3 group hover:bg-gold/10 hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gold/20 group-hover:bg-gold/50 transition-colors" />
                  <Trophy className="h-10 w-10 text-gold mx-auto drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] group-hover:rotate-6 transition-transform" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-gold pt-1">
                      Hall of Records
                    </div>
                    <div className="text-[9px] text-gold-muted/60 uppercase tracking-widest mt-1">
                      Verified Historical Archive
                    </div>
                  </div>
                  <Link
                    to="/records"
                    className="inline-flex items-center gap-1 text-[10px] text-cream/40 group-hover:text-gold transition-colors font-bold uppercase tracking-tighter border-t border-white/5 pt-2 w-full justify-center"
                  >
                    Secure Access <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="text-center">
                  <Link
                    to="/awards"
                    className="text-[10px] font-bold text-cream-muted hover:text-gold uppercase tracking-[0.2em] transition-colors"
                  >
                    View Full Trophy Case
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
