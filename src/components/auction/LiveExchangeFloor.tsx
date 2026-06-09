import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumericValue } from "@/components/horse/HorseBits";
import { KIND_LABELS } from "@/game/auction/data";
import { Gavel } from "lucide-react";
import type { AuctionSale } from "@/game/types";

interface LiveExchangeFloorProps {
  sales: AuctionSale[];
}

export function LiveExchangeFloor({ sales }: LiveExchangeFloorProps) {
  if (sales.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-success">
          Live Exchange Floor
        </h2>
      </div>
      <div className="grid gap-4">
        {sales.map((sale) => (
          <Card
            key={sale.id}
            className="bg-slate-900/60 border-success/30 rounded-none shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Gavel className="h-32 w-32 -rotate-12 text-success" />
            </div>
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="space-y-2 text-center md:text-left">
                <Badge className="bg-success text-slate-950 font-black uppercase text-[10px] tracking-[0.2em] rounded-none px-3">
                  Active_Ring
                </Badge>
                <h3 className="text-4xl font-black text-cream font-[family-name:var(--font-display)] uppercase tracking-tight">
                  {sale.name}
                </h3>
                <p className="text-xs font-mono text-cream/40 uppercase tracking-tighter">
                  {KIND_LABELS[sale.kind as keyof typeof KIND_LABELS] ?? sale.kind} ·{" "}
                  <NumericValue value={sale.lots.filter((l) => !l.withdrawn).length} /> Lots Listed
                </p>
              </div>
              <Link to="/auction/$saleId" params={{ saleId: sale.id }} className="w-full md:w-auto">
                <Button
                  size="lg"
                  className="w-full h-14 px-8 bg-success hover:bg-success/90 text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-xs shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                >
                  <Gavel className="h-4 w-4 mr-3" />
                  Enter Sale
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
