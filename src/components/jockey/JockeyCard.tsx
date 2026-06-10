import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Jockey } from "@/game/types";
import {
  Trophy,
  Calendar,
  DollarSign,
  Target,
  RefreshCw,
  ChevronRight,
  User,
  ShieldCheck,
} from "lucide-react";
import { JockeyAvatar } from "./JockeyAvatar";
import { JockeyStatsGrid } from "./JockeyStatsGrid";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/lib/formatting";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface JockeyCardProps {
  jockey: Jockey;
  isRetained?: boolean;
  onAction?: (jockey: Jockey) => void;
  actionLabel?: string;
  onClick?: () => void;
  className?: string;
}

export function JockeyCard({
  jockey,
  isRetained,
  onAction,
  actionLabel,
  onClick,
  className,
}: JockeyCardProps) {
  const rerollJockeySilk = useGame((s) => s.rerollJockeySilk);

  let claim = 0;
  if ((jockey as any).isApprentice) {
    const wins = jockey.careerWins ?? 0;
    if (wins < 5) claim = 7;
    else if (wins < 15) claim = 5;
    else if (wins < 30) claim = 3;
  }

  const archetypeColors: Record<string, string> = {
    front_runner: "border-chart-1 text-chart-1 bg-chart-1/5",
    closer: "border-chart-3 text-chart-3 bg-chart-3/5",
    clinical: "border-success text-success bg-success/5",
    finisher: "border-destructive text-destructive bg-destructive/5",
    versatile: "border-fame text-fame bg-fame/5",
  };

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "bg-slate-900/60 border-white/5 rounded-none shadow-2xl relative overflow-hidden group flex flex-col h-full transition-all duration-300",
        onClick &&
          "cursor-pointer hover:border-blue-400/40 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500 transition-colors z-10" />

      <CardHeader className="p-5 border-b border-white/5 bg-black/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <JockeyAvatar jockey={jockey} size="md" />
              {isRetained && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    rerollJockeySilk(jockey.id);
                  }}
                  className="absolute -top-1 -right-1 bg-slate-950 border border-white/10 text-cream rounded-full p-1 shadow-xl hover:text-gold transition-colors z-20"
                  title="Reroll Silks"
                  aria-label={`Reroll Silks for ${jockey.name}`}
                >
                  <RefreshCw size={10} />
                </button>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-xl font-bold text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-blue-400 transition-colors truncate">
                {jockey.name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest h-4 px-1.5 rounded-none",
                    archetypeColors[jockey.archetype],
                  )}
                >
                  {jockey.archetype.replace("_", " ")}
                </Badge>
                {(jockey as any).isApprentice && (
                  <Badge className="bg-amber-600 text-cream text-[9px] font-black uppercase tracking-widest h-4 px-1.5 rounded-none border-none">
                    Apprentice {claim > 0 ? `(-${claim} lbs)` : ""}
                  </Badge>
                )}
                {isRetained && (
                  <Badge className="bg-blue-500 text-slate-950 text-[9px] font-black uppercase tracking-widest h-4 px-1.5 rounded-none">
                    Signed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-black uppercase text-blue-400/40 tracking-widest leading-none mb-1">
              Mount Fee
            </div>
            <div className="text-lg font-black font-mono text-gold tabular-nums tracking-tighter">
              {formatCurrency(jockey.ridingFee)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Personnel Bio Strip */}
        <div className="flex items-center justify-between px-5 py-2 bg-white/[0.02] border-b border-white/5 text-[9px] font-mono uppercase tracking-widest text-cream/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 opacity-40" /> Age: {jockey.age}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-fame/60" /> {jockey.careerWins} WINS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-warning/40" />
            <span>Fame: {jockey.fame.toFixed(0)}</span>
          </div>
        </div>

        <div className="p-5 flex-1 space-y-6">
          <JockeyStatsGrid jockey={jockey} />

          <div className="flex items-center justify-between bg-black/40 p-2 rounded-sm border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                Licensed
              </span>
              <span
                className={cn(
                  "text-[9px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5",
                  (jockey as any).isApprentice ? "text-amber-500/60" : "text-success/60",
                )}
              >
                <ShieldCheck className="h-2.5 w-2.5" />{" "}
                {(jockey as any).isApprentice ? "ACTIVE_ACADEMY" : "ACTIVE_PRO"}
              </span>
            </div>
            <Link
              to="/jockey/$jockeyId"
              params={{ jockeyId: jockey.id }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[8px] font-black text-blue-400/60 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                VIEW_BIO <ChevronRight className="h-2.5 w-2.5" />
              </span>
            </Link>
          </div>
        </div>

        {onAction && (
          <div className="p-3 bg-black/40 border-t border-white/5">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAction(jockey);
              }}
              className="w-full h-9 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black uppercase tracking-widest text-[10px] rounded-none shadow-lg"
            >
              <DollarSign className="h-3 w-3 mr-2" />
              {actionLabel || "Hire"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
