import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, BarChart3, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import { formatCurrency } from "@/core/common/formatting";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  buildMarketDepth,
  buildOrderBooks,
  createDefaultExchangeState,
  exchangeCommissionRate,
  suggestAskPrice,
  tradeSeries,
} from "@/core/market/exchange";
import { HorseOrderBook } from "@/components/market/HorseOrderBook";
import { TradeTape } from "@/components/market/TradeTape";

export function ExchangePanel() {
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const exchange = useGameWithShallow((s: GameState) => s.exchange ?? createDefaultExchangeState());
  const refreshExchange = useGame((s) => s.refreshExchange);
  const listHorseOnExchange = useGame((s) => s.listHorseOnExchange);
  const cancelExchangeListing = useGame((s) => s.cancelExchangeListing);
  const acceptExchangeBid = useGame((s) => s.acceptExchangeBid);
  const buyFromExchange = useGame((s) => s.buyFromExchange);

  const [selected, setSelected] = useState<string | null>(null);
  const [listHorseId, setListHorseId] = useState<string>("");
  const [listPrice, setListPrice] = useState<string>("");

  useEffect(() => {
    refreshExchange();
  }, [refreshExchange, day]);

  const horseList = useMemo(() => Object.values(horses) as Horse[], [horses]);
  const books = useMemo(() => buildOrderBooks(exchange, horseList, day), [exchange, horseList, day]);
  const depth = useMemo(() => buildMarketDepth(books, exchange, day), [books, exchange, day]);
  const series = useMemo(() => tradeSeries(exchange, day), [exchange, day]);

  const sellable = useMemo(
    () =>
      horseList
        .filter(
          (h) =>
            isPlayerOwned(h) &&
            h.lifecycleStatus !== "deceased" &&
            !h.consignedSaleId &&
            !exchange.asks.some((a) => a.horseId === h.id && a.sellerId === "player"),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [horseList, exchange.asks],
  );

  const myListings = useMemo(
    () => exchange.asks.filter((a) => a.sellerId === "player"),
    [exchange.asks],
  );
  const npcListings = useMemo(
    () => exchange.asks.filter((a) => a.sellerId !== "player").sort((a, b) => a.price - b.price),
    [exchange.asks],
  );

  const selectedBook = books.find((b) => b.horseId === selected) ?? books[0];
  const suggestion = listHorseId
    ? suggestAskPrice(horses[listHorseId] as Horse, horseList)
    : undefined;

  const maxVolume = Math.max(...series.map((s) => s.volume), 1);
  const maxDepth = Math.max(
    ...depth.askLevels.map((l) => l.count),
    ...depth.bidLevels.map((l) => l.count),
    1,
  );

  function run(result: { ok: true } | { ok: false; reason: string }, success: string) {
    if (result.ok) toast.success(success);
    else toast.error(result.reason);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Price Index" value={formatCurrency(depth.priceIndex)} sub={`${books.length} horses quoted`} />
        <Stat
          label="30d Volume"
          value={`${depth.volume30d} trades`}
          sub={`${formatCurrency(depth.turnover30d)} turnover`}
        />
        <Stat
          label="Open Orders"
          value={`${depth.openAsks} asks / ${depth.openBids} bids`}
          sub={`Median spread ${formatCurrency(depth.medianSpread)}`}
        />
        <Stat
          label="Commission"
          value={`${(exchangeCommissionRate() * 100).toFixed(2)}%`}
          sub="Charged on sale proceeds"
        />
      </div>

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream-muted">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Market Depth by Price Band
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <DepthColumn title="Bid depth" levels={depth.bidLevels} max={maxDepth} tone="success" />
            <DepthColumn title="Ask depth" levels={depth.askLevels} max={maxDepth} tone="destructive" />
          </div>
          <div className="space-y-1 border-t border-white/5 pt-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
              Daily traded volume (30d)
            </h4>
            <div className="flex h-12 items-end gap-0.5">
              {series.map((s) => (
                <div
                  key={s.day}
                  className="flex-1 rounded-t bg-primary/60"
                  style={{ height: `${Math.max(2, (s.volume / maxVolume) * 100)}%` }}
                  title={`Day ${s.day}: ${s.volume} trades · ${formatCurrency(s.turnover)}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream-muted">
            <Tag className="h-3.5 w-3.5 text-primary" />
            List a Horse
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={listHorseId}
              onChange={(e) => {
                setListHorseId(e.target.value);
                const h = horses[e.target.value] as Horse | undefined;
                setListPrice(h ? String(suggestAskPrice(h, horseList).suggested) : "");
              }}
              aria-label="Horse to list"
              className="min-w-[200px] rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-cream"
            >
              <option value="">Select a horse…</option>
              {sellable.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.age}yo {h.gender})
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Ask price"
              aria-label="Ask price"
              className="w-36"
            />
            <Button
              disabled={!listHorseId || !listPrice}
              onClick={() => {
                run(
                  listHorseOnExchange(listHorseId, Number(listPrice)),
                  "Listing posted to the exchange",
                );
                setListHorseId("");
                setListPrice("");
              }}
            >
              Post Ask
            </Button>
            {suggestion && (
              <span className="text-[11px] text-cream-muted">
                Fair {formatCurrency(suggestion.fairValue)} · band{" "}
                {formatCurrency(suggestion.low)}–{formatCurrency(suggestion.high)}
              </span>
            )}
          </div>

          {myListings.length > 0 && (
            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
                Your listings
              </h4>
              {myListings.map((a) => {
                const book = books.find((b) => b.horseId === a.horseId);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 bg-slate-950/50 px-3 py-2 text-xs"
                  >
                    <span className="text-cream">
                      {(horses[a.horseId] as Horse | undefined)?.name ?? a.horseId}
                    </span>
                    <span className="flex items-center gap-3 text-cream-muted">
                      <span>
                        Ask <span className="tabular-nums text-cream">{formatCurrency(a.price)}</span>
                      </span>
                      <span>
                        Best bid{" "}
                        <span className="tabular-nums text-cream">
                          {book?.bestBid !== undefined ? formatCurrency(book.bestBid) : "—"}
                        </span>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(a.horseId)}>
                        Book
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => run(cancelExchangeListing(a.id), "Listing cancelled")}
                      >
                        Cancel
                      </Button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-4 space-y-2">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream-muted">
              <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
              Live Listings
            </h3>
            {npcListings.length === 0 ? (
              <p className="text-xs text-cream-muted">No stables are offering horses right now.</p>
            ) : (
              npcListings.slice(0, 15).map((a) => {
                const horse = horses[a.horseId] as Horse | undefined;
                const book = books.find((b) => b.horseId === a.horseId);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 bg-slate-950/50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-cream">{horse?.name ?? a.horseId}</span>
                      <span className="text-[10px] text-cream-muted">
                        {a.sellerName}
                        {a.intent ? ` · ${a.intent}` : ""}
                        {a.pressureMeter !== undefined ? ` · cash pressure ${a.pressureMeter}` : ""}
                        {" · fair "}
                        {formatCurrency(a.fairValue)}
                        {book?.bestBid !== undefined
                          ? ` · best bid ${formatCurrency(book.bestBid)}`
                          : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge
                        variant={a.price > a.fairValue * 1.25 ? "destructive" : "outline"}
                        className="text-[10px] tabular-nums"
                      >
                        {formatCurrency(a.price)}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(a.horseId)}>
                        Book
                      </Button>
                      <Button
                        size="sm"
                        disabled={cash < a.price}
                        onClick={() => run(buyFromExchange(a.id), `Bought ${horse?.name ?? "horse"}`)}
                      >
                        Buy
                      </Button>
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-4">
            <TradeTape trades={exchange.trades} day={day} />
          </CardContent>
        </Card>
      </div>

      {selectedBook && (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-cream">
                Order Book — {selectedBook.horseName}
              </h3>
              <select
                value={selectedBook.horseId}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Select horse order book"
                className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-cream"
              >
                {books.map((b) => (
                  <option key={b.horseId} value={b.horseId}>
                    {b.horseName}
                  </option>
                ))}
              </select>
            </div>
            <HorseOrderBook
              book={selectedBook}
              cash={cash}
              onBuyAsk={(id) => run(buyFromExchange(id), "Purchase settled")}
              onAcceptBid={(id) => run(acceptExchangeBid(id), "Sale settled")}
              onCancelAsk={(id) => run(cancelExchangeListing(id), "Listing cancelled")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="border-white/5 bg-slate-900/40">
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-cream-muted">{label}</p>
        <p className="text-lg font-bold tabular-nums text-cream">{value}</p>
        <p className="text-[10px] text-cream-muted mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function DepthColumn({
  title,
  levels,
  max,
  tone,
}: {
  title: string;
  levels: { price: number; count: number }[];
  max: number;
  tone: "success" | "destructive";
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-cream-muted">{title}</h4>
      {levels.length === 0 ? (
        <p className="text-xs text-cream-muted">No orders.</p>
      ) : (
        levels.map((l) => (
          <div key={l.price} className="flex items-center gap-2 text-[11px]">
            <span className="w-20 shrink-0 tabular-nums text-cream-muted">
              ≤{formatCurrency(l.price)}
            </span>
            <span className="h-2 flex-1 rounded bg-white/5">
              <span
                className={`block h-2 rounded ${tone === "success" ? "bg-success" : "bg-destructive"}`}
                style={{ width: `${(l.count / max) * 100}%` }}
              />
            </span>
            <span className="w-6 shrink-0 tabular-nums text-cream">{l.count}</span>
          </div>
        ))
      )}
    </div>
  );
}
