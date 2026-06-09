import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ListChecks, Users, History, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { useNpcStableDetail } from "@/hooks/useNpcStableDetail";

interface NpcStableInfoSidebarProps {
  stableId: string;
  pageData: ReturnType<typeof useNpcStableDetail>;
  navigate: (opts: { search: { tab: "overview" | "roster" | "staff" | "history" } }) => void;
}

export function NpcStableInfoSidebar({ stableId, pageData, navigate }: NpcStableInfoSidebarProps) {
  const { stable, stableHorses, friction } = pageData;

  if (!stable) return null;

  return (
    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <Card className="bg-slate-900/60 border-white/5 rounded-none shadow-2xl">
        <CardHeader className="pb-3 border-b border-white/5 bg-black/40">
          <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-cream/40">
            Entity Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            <div className="flex justify-between items-center p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                Tier
              </span>
              <Badge
                className={cn(
                  "rounded-none h-4 px-1.5 text-[8px] font-black uppercase tracking-widest",
                  stable.tier === "elite"
                    ? "bg-fame text-slate-950"
                    : stable.tier === "mid"
                      ? "bg-gold text-slate-950"
                      : "bg-slate-700 text-cream",
                )}
              >
                {stable.tier}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                Relation
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  friction > 50
                    ? "text-destructive"
                    : friction < -30
                      ? "text-success"
                      : "text-cream/60",
                )}
              >
                {friction > 70
                  ? "HATED"
                  : friction > 30
                    ? "TENSE"
                    : friction < -50
                      ? "ALLY"
                      : "NEUTRAL"}
              </span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                Reputation
              </span>
              <span className="text-fame flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Trophy
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < Math.floor(stable.reputation / 20) ? "fill-current" : "opacity-20",
                    )}
                  />
                ))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-white/5 rounded-none shadow-2xl">
        <CardHeader className="pb-3 border-b border-white/5 bg-black/40">
          <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-cream/40">
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            <button
              onClick={() => navigate({ search: { tab: "roster" } })}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
            >
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                <ListChecks className="h-3 w-3" /> Horse Roster
              </span>
              <span className="font-mono text-[10px] text-cream/20">{stableHorses.length}</span>
            </button>
            <button
              onClick={() => navigate({ search: { tab: "staff" } })}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
            >
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                <Users className="h-3 w-3" /> Personnel
              </span>
            </button>
            <button
              onClick={() => navigate({ search: { tab: "history" } })}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
            >
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                <History className="h-3 w-3" /> Records
              </span>
            </button>
            <Link
              to="/races"
              search={{
                grade: "all",
                country: "all",
                surface: "all",
                track: "all",
                owned: "all",
                q: "",
                stableId,
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
            >
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-gold">
                <CalendarDays className="h-3 w-3" /> Schedule
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
