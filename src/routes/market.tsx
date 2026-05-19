import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall, NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { horsePrice } from "@/core/horse/pricing";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/utils";
import { SyndicateMarket } from "@/components/SyndicateMarket";
import {
  Store,
  ShieldCheck,
  ChevronRight,
  Search,
  Briefcase,
  Users,
  TrendingUp,
  Activity,
  HardDrive,
  Zap,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/market")({
  component: MarketPage,
});

function MarketPage() {
  const [activeTab, setActiveTab] = useState<"bloodstock" | "syndicate">("bloodstock");
  const market = (useGame as any)((s: GameState) => s.market, shallow);
  const cash = useGame((s: GameState) => s.cash);
  const buyHorse = useGame((s) => s.buyHorse);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Market Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-success/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-success uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Store className="h-3.5 w-3.5" />
            Horse Market
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            The Horse Market
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Available Units: <NumericValue value={market.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Market Class: <span className="text-success-dark">Private Sale</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Exchange: <span className="text-success font-black">OPEN</span>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
          <TabsList className="bg-transparent h-10 gap-2">
            <TabsTrigger
              value="bloodstock"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-success data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              Direct Bloodstock
            </TabsTrigger>
            <TabsTrigger
              value="syndicate"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Fractional Syndicates
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="bloodstock"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 focus-visible:outline-none"
        >
          <Link to="/npc-stables" search={{ q: "", tier: "all" }} className="block group">
            <Card className="bg-slate-900/40 border-white/5 rounded-none hover:border-success/40 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-success/20 group-hover:bg-success transition-colors" />
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-success/10 flex items-center justify-center border border-success/20 rounded">
                    <Target className="h-5 w-5 text-success" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-cream uppercase tracking-tight group-hover:text-success transition-colors">
                      Scout Rival Entities
                    </h3>
                    <p className="text-[10px] font-mono text-cream/40 uppercase tracking-tighter">
                      Browse high-value assets owned by competing stables for direct procurement.
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-cream/20 group-hover:translate-x-1 transition-transform group-hover:text-success" />
              </CardContent>
            </Card>
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {market.map((h: Horse) => {
              const price = horsePrice(h);
              const ovr = overall(h);
              const canAfford = cash >= price;

              return (
                <Card
                  key={h.id}
                  className="bg-slate-900/40 border-white/5 rounded-none relative overflow-hidden group hover:border-white/20 transition-all duration-300 shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-white/5 group-hover:bg-success/40 transition-colors" />

                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <SilkDot color={h.silk} size="md" />
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="text-xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight group-hover:text-success transition-colors truncate">
                            {h.name}
                          </h3>
                          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest text-cream/30">
                            <span>Age: {Math.floor(h.age)}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span>OVR: {ovr}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black uppercase text-success/40 tracking-widest leading-none mb-1">
                          Price
                        </div>
                        <div
                          className={cn(
                            "text-xl font-black font-mono tracking-tighter tabular-nums",
                            canAfford ? "text-success" : "text-destructive/60",
                          )}
                        >
                          {formatCurrency(price)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/40 p-3 rounded border border-white/5">
                      <HorseStats horse={h} />
                    </div>

                    <Button
                      onClick={() => buyHorse(h.id)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full h-10 uppercase text-[10px] font-black tracking-[0.2em] rounded-none transition-all",
                        canAfford
                          ? "bg-success hover:bg-success-dark text-slate-950 shadow-lg"
                          : "border-white/5 text-cream/20 bg-transparent",
                      )}
                    >
                      {canAfford ? "Buy" : "Can't afford"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {market.length === 0 && (
              <div className="col-span-full p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
                <HardDrive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
                <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                  Market Transmission Offline
                </p>
                <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                  Zero units detected in bloodstock exchange. Check next cycle.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="syndicate"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none"
        >
          <div className="space-y-6">
            <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <TrendingUp className="h-32 w-32 -rotate-12" />
              </div>
              <div className="relative z-10 space-y-1">
                <h2 className="text-xl font-black font-[family-name:var(--font-display)] text-blue-400 uppercase tracking-widest">
                  Stallion Syndicates
                </h2>
                <p className="text-[10px] font-mono text-cream/40 uppercase tracking-tighter">
                  Equity-based asset management for G1-tier stallions. High-yield stud fee
                  dividends.
                </p>
              </div>
            </div>
            <SyndicateMarket />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
