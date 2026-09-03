import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/common/formatting";
import { netProceeds, type HorseOrderBook as Book } from "@/core/market/exchange";

export function HorseOrderBook({
  book,
  cash,
  onBuyAsk,
  onAcceptBid,
  onCancelAsk,
}: {
  book: Book;
  cash: number;
  onBuyAsk: (askId: string) => void;
  onAcceptBid: (bidId: string) => void;
  onCancelAsk: (askId: string) => void;
}) {
  const maxSize = Math.max(
    ...book.asks.map((a) => a.price),
    ...book.bids.map((b) => b.price),
    1,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-cream-muted">
          Fair value <span className="text-cream tabular-nums">{formatCurrency(book.fairValue)}</span>
        </span>
        <span className="text-cream-muted">
          Mid <span className="text-cream tabular-nums">{formatCurrency(book.mid)}</span>
        </span>
        {book.spread !== undefined && (
          <span className="text-cream-muted">
            Spread <span className="text-cream tabular-nums">{formatCurrency(book.spread)}</span>
          </span>
        )}
        {book.lastTrade !== undefined && (
          <Badge variant="outline" className="text-[10px]">
            Last traded {formatCurrency(book.lastTrade)}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
            Asks (sellers)
          </h4>
          {book.asks.length === 0 ? (
            <p className="text-xs text-cream-muted">No sellers.</p>
          ) : (
            book.asks.map((a) => (
              <div
                key={a.id}
                className="relative flex items-center justify-between gap-2 overflow-hidden rounded border border-white/5 bg-slate-950/50 px-2 py-1.5 text-xs"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-destructive/10"
                  style={{ width: `${(a.price / maxSize) * 100}%` }}
                  aria-hidden
                />
                <span className="relative truncate text-cream-muted">{a.sellerName}</span>
                <span className="relative flex items-center gap-2">
                  <span className="tabular-nums text-cream">{formatCurrency(a.price)}</span>
                  {a.sellerId === "player" ? (
                    <Button size="sm" variant="ghost" onClick={() => onCancelAsk(a.id)}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={cash < a.price}
                      onClick={() => onBuyAsk(a.id)}
                      title={cash < a.price ? "Insufficient funds" : undefined}
                    >
                      Buy
                    </Button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-1.5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
            Bids (buyers)
          </h4>
          {book.bids.length === 0 ? (
            <p className="text-xs text-cream-muted">No bids.</p>
          ) : (
            book.bids.map((b) => (
              <div
                key={b.id}
                className="relative flex items-center justify-between gap-2 overflow-hidden rounded border border-white/5 bg-slate-950/50 px-2 py-1.5 text-xs"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-success/10"
                  style={{ width: `${(b.price / maxSize) * 100}%` }}
                  aria-hidden
                />
                <span className="relative min-w-0 truncate text-cream-muted" title={b.rationale}>
                  {b.bidderName}
                </span>
                <span className="relative flex items-center gap-2">
                  <span className="tabular-nums text-cream">{formatCurrency(b.price)}</span>
                  {book.isPlayerOwned && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onAcceptBid(b.id)}
                      title={`Net ${formatCurrency(netProceeds(b.price))} after commission`}
                    >
                      Sell
                    </Button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
