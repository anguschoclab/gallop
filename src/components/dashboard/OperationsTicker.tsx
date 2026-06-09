import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/lib/formatting";
import { Activity, Heart, Briefcase, Zap } from "lucide-react";

export function OperationsTicker() {
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);
  const pregnancies = useGame((s) => s.pregnancies);
  const hiredStaff = useGame((s) => s.hiredStaff);
  const syndicates = useGame((s) => s.syndicates);

  const activeHorses = horses.filter((h) => h.owned && h.lifecycleStatus === "active");
  const playerSyndicates = Array.isArray(syndicates)
    ? syndicates.filter((s: any) => s.ownerId === "player")
    : [];

  return (
    <Card className="border-gold-muted bg-slate-900/60 backdrop-blur-xl shadow-inner border-l-4 border-l-gold">
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
                <span className="text-cream font-bold tabular-nums">{playerSyndicates.length}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success/50 transition-all duration-1000"
                  style={{ width: `${Math.min(100, playerSyndicates.length * 20)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
