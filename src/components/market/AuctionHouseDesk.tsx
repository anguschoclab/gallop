/**
 * AuctionHouseDesk.tsx - Buy and sell horses at auction house prices
 *
 * Each house quotes its own prices: prestige scales the hammer estimate and the
 * house's commission sets the buy/sell spread. Includes the live price chart and
 * a running history of settled trades.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Gavel, History, ShoppingCart, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/common/formatting";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { createDefaultExchangeState } from "@/core/market/exchange";
import { AUCTION_HOUSES } from "@/core/prestige/auctionHouses";
import { buildHouseCatalogue, houseQuote } from "@/core/market/houseQuotes";
import { MarketPriceChart } from "./MarketPriceChart";

export function AuctionHouseDesk() {
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const exchange = useGameWithShallow((s: GameState) => s.exchange ?? createDefaultExchangeState());
  const sellHorseToAuctionHouse = useGame((s) => s.sellHorseToAuctionHouse);
  const buyHorseFromAuctionHouse = useGame((s) => s.buyHorseFromAuctionHouse);

  const [houseId, setHouseId] = useState<string>(AUCTION_HOUSES[0].id);
  const house = AUCTION_HOUSES.find((h) => h.id === houseId) ?? AUCTION_HOUSES[0];

  const horseList = useMemo(() => Object.values(horses) as Horse[], [horses]);

  const catalogue = useMemo(
    () => buildHouseCatalogue({ day, house, horses: horseList }),
    [day, house, horseList],
  );

  const myHorses = useMemo(
    () =>
      horseList
        .filter((h) => isPlayerOwned(h) && h.lifecycleStatus !== "deceased" && !h.consignedSaleId)
        .map((h) => ({ horse: h, quote: houseQuote(h, horseList, house) }))
        .sort((a, b) => b.quote.sellPrice - a.quote.sellPrice),
    [horseList, house],
  );

  const trades = useMemo(() => [...exchange.trades].reverse().slice(0, 25), [exchange.trades]);

  const handleBuy = (horseId: string, name: string, price: number) => {
    const res = buyHorseFromAuctionHouse(horseId, house.id);
    if (!res.ok) toast.error(res.reason ?? "Purchase failed");
    else toast.success(`Bought ${name} at ${house.shortName} for ${formatCurrency(price)}`);
  };

  const handleSell = (horseId: string, name: string, price: number) => {
    const res = sellHorseToAuctionHouse(horseId, house.id);
    if (!res.ok) toast.error(res.reason ?? "Sale failed");
    else toast.success(`Sold ${name} through ${house.shortName} — net ${formatCurrency(price)}`);
  };

  return (
    <div className="space-y-6">
      {/* House selector */}
      <div className="flex flex-wrap gap-2">
        {AUCTION_HOUSES.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setHouseId(h.id)}
            aria-pressed={h.id === houseId}
            className={`px-4 py-2 border text-left transition-all ${
              h.id === houseId
                ? "border-warning/60 bg-warning/10"
                : "border-white/5 bg-slate-900/40 hover:border-white/20"
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-cream">
              {h.shortName}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-cream/40">
              {h.country} · Prestige {h.prestige}
            </div>
          </button>
        ))}
      </div>

      <Card className="bg-warning/5 border-warning/20 rounded-none">
        <CardContent className="p-5 space-y-1">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-warning" />
            <h2 className="text-lg font-black uppercase tracking-widest text-warning font-[family-name:var(--font-display)]">
              {house.name}
            </h2>
          </div>
          <p className="text-[11px] font-mono text-cream/50">{house.blurb}</p>
          <div className="flex flex-wrap gap-3 pt-2 text-[10px] font-mono uppercase tracking-widest text-cream/40">
            <span>
              Prestige <span className="text-cream">{house.prestige}</span>
            </span>
            <span>
              Commission{" "}
              <span className="text-cream">
                {((0.04 + house.commissionSurcharge) * 100).toFixed(1)}%
              </span>
            </span>
            <span>
              Your capital <span className="text-success">{formatCurrency(cash)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <MarketPriceChart trades={exchange.trades} day={day} />

      {/* Buy board */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cream/70">
          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
          On offer at {house.shortName}
        </h3>
        {catalogue.length === 0 ? (
          <p className="text-[11px] font-mono uppercase tracking-widest text-cream/30">
            No lots on the board today.
          </p>
        ) : (
          <div className="divide-y divide-white/5 border border-white/5 bg-slate-900/40">
            {catalogue.map(({ horse, ...quote }) => (
              <div key={horse.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[180px] flex-1">
                  <Link
                    to="/stable/$horseId"
                    params={{ horseId: horse.id }}
                    className="font-bold text-cream hover:text-primary transition-colors"
                  >
                    {horse.name}
                  </Link>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40">
                    {horse.age}yo {horse.gender} · Est. value {formatCurrency(quote.fairValue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-cream/30">
                    Hammer
                  </div>
                  <div className="font-mono tabular-nums text-cream/80">
                    {formatCurrency(quote.hammerEstimate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-cream/30">
                    You pay
                  </div>
                  <div className="font-mono tabular-nums font-bold text-cream">
                    {formatCurrency(quote.buyPrice)}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={cash < quote.buyPrice}
                  onClick={() => handleBuy(horse.id, horse.name, quote.buyPrice)}
                >
                  Buy
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sell board */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cream/70">
          <Tag className="h-3.5 w-3.5 text-success" />
          Sell through {house.shortName}
        </h3>
        {myHorses.length === 0 ? (
          <p className="text-[11px] font-mono uppercase tracking-widest text-cream/30">
            You have no horses available to sell.
          </p>
        ) : (
          <div className="divide-y divide-white/5 border border-white/5 bg-slate-900/40">
            {myHorses.map(({ horse, quote }) => (
              <div key={horse.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[180px] flex-1">
                  <Link
                    to="/stable/$horseId"
                    params={{ horseId: horse.id }}
                    className="font-bold text-cream hover:text-success transition-colors"
                  >
                    {horse.name}
                  </Link>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40">
                    {horse.age}yo {horse.gender} · Market {formatCurrency(quote.fairValue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-cream/30">
                    Commission
                  </div>
                  <div className="font-mono tabular-nums text-cream/60">
                    -{formatCurrency(quote.commission)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-cream/30">
                    You net
                  </div>
                  <div className="font-mono tabular-nums font-bold text-success">
                    {formatCurrency(quote.sellPrice)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSell(horse.id, horse.name, quote.sellPrice)}
                >
                  Sell
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trade history */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cream/70">
          <History className="h-3.5 w-3.5 text-cream/40" />
          Trade history
        </h3>
        {trades.length === 0 ? (
          <p className="text-[11px] font-mono uppercase tracking-widest text-cream/30">
            No trades settled yet.
          </p>
        ) : (
          <div className="divide-y divide-white/5 border border-white/5 bg-slate-900/40">
            {trades.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 p-2.5 text-[11px] font-mono"
              >
                <Badge variant="outline" className="text-[9px] text-cream/50">
                  Day {t.day}
                </Badge>
                <span className="flex-1 min-w-[140px] font-sans font-bold text-cream">
                  {t.horseName}
                </span>
                <span className="text-cream/40 truncate max-w-[220px]">
                  {t.sellerName} → {t.buyerName}
                </span>
                <span className="tabular-nums font-bold text-cream">
                  {formatCurrency(t.price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
