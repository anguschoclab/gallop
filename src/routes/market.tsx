import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";
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

export const Route = createFileRoute("/market")({
  component: MarketPage,
});

function MarketPage() {
  const [activeTab, setActiveTab] = useState<"bloodstock" | "syndicate">("bloodstock");
  const market = useGame((s) => s.market);
  const cash = useGame((s) => s.cash);
  const buyHorse = useGame((s) => s.buyHorse);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Market
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Acquire horses and invest in stallion syndicates.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "bloodstock" ? "default" : "outline"}
          onClick={() => setActiveTab("bloodstock")}
          className="font-[family-name:var(--font-display)]"
        >
          Bloodstock
        </Button>
        <Button
          variant={activeTab === "syndicate" ? "default" : "outline"}
          onClick={() => setActiveTab("syndicate")}
          className="font-[family-name:var(--font-display)]"
        >
          Syndicates
        </Button>
      </div>

      {activeTab === "bloodstock" && (
        <div className="space-y-6">
          <Link to="/npc-stables">
            <Card className="hover:bg-t700 transition-colors border-gold-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-[family-name:var(--font-display)]">
                  Scout Rival Stables
                </CardTitle>
                <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                  Browse horses owned by rival stables for potential acquisitions
                </p>
              </CardHeader>
            </Card>
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {market.map((h) => {
              const price = horsePrice(h);
              return (
                <Card key={h.id} className="border-gold-muted">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <SilkDot color={h.silk} size="md" />
                      <div className="flex-1">
                        <p className="font-bold text-cream font-[family-name:var(--font-display)]">
                          {h.name}
                        </p>
                        <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                          Age <NumericValue value={Math.floor(h.age)} /> ·{" "}
                          <JargonTooltip term="OVR">OVR</JargonTooltip>{" "}
                          <NumericValue value={overall(h)} />
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-base font-[family-name:var(--font-mono)] tabular-nums border border-gold-muted bg-t700 text-cream",
                        )}
                      >
                        ${formatCurrency(price)}
                      </Badge>
                    </div>
                    <HorseStats horse={h} />
                    <Button
                      onClick={() => buyHorse(h.id)}
                      disabled={cash < price}
                      className="w-full"
                      size="sm"
                    >
                      {cash < price ? "Insufficient funds" : "Acquire Horse"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {market.length === 0 && (
              <Card className="col-span-full border-gold-muted">
                <CardContent className="p-12 text-center text-cream-muted italic font-[family-name:var(--font-body)]">
                  The market is quiet today. Check back tomorrow for new offerings.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "syndicate" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
              Stallion Syndicates
            </h2>
            <p className="text-cream-muted font-[family-name:var(--font-body)]">
              Purchase shares in G1-winning stallions and earn stud fee dividends.
            </p>
          </div>
          <SyndicateMarket />
        </div>
      )}
    </div>
  );
}
