import { createFileRoute, Link } from "@tanstack/react-router";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import { useAuctions } from "@/hooks/game/useMarketState";
import type { GameState } from "@/game/types";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { SALE_TRIGGERS } from "@/game/auction/data";
import { isLotEligible } from "@/game/auction/engine";
import { CONSIGNMENT_COMMISSION } from "@/constants/game";
import { Gavel } from "lucide-react";
import { NumericValue } from "@/components/horse/HorseBits";
import { ConsignDialog } from "@/components/auction/ConsignDialog";
import { ConsignmentSidebar } from "@/components/auction/ConsignmentSidebar";
import { TransactionArchive } from "@/components/auction/TransactionArchive";
import { LiveExchangeFloor } from "@/components/auction/LiveExchangeFloor";
import { UpcomingLedgerTable } from "@/components/auction/UpcomingLedgerTable";
import type { AuctionSale, Horse } from "@/game/types";

type SaleDisplay =
  | AuctionSale
  | {
      id: string;
      name: string;
      kind: string;
      day: number;
      lots: Array<{ consignorStableId?: string; withdrawn?: boolean }>;
      resolved: false;
      isScheduled: true;
    };

export const Route = createFileRoute("/auction/")({
  component: AuctionPage,
});

function AuctionPage() {
  const auctions = useAuctions() as AuctionSale[];
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const day = useGame((s: GameState) => s.day);

  const [consignOpen, setConsignOpen] = useState(false);
  const [consignTarget, setConsignTarget] = useState<{ horse: Horse; sale: AuctionSale } | null>(
    null,
  );

  const activeUpcoming = auctions.filter((a) => !a.resolved).sort((a, b) => a.day - b.day);
  const todaysSales = activeUpcoming.filter((s) => s.day === day);

  const allUpcoming: SaleDisplay[] = SALE_TRIGGERS.map((t) => {
    const actual = activeUpcoming.find((a) => a.kind === t.kind);
    if (actual) return actual;

    const currentDoy = dayOfYear(day);
    const daysAway = t.doy >= currentDoy ? t.doy - currentDoy : 365 - currentDoy + t.doy;
    const futureDay = day + daysAway;

    return {
      id: `scheduled-${t.kind}`,
      name: t.name,
      kind: t.kind,
      day: futureDay,
      lots: [],
      resolved: false,
      isScheduled: true,
    };
  }).sort((a, b) => a.day - b.day);

  const past = auctions
    .filter((a) => a.resolved)
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  const playerHorses = horses.filter((h: Horse) => h.owned && !h.consignedSaleId);

  function findEligibleSale(horse: Horse): AuctionSale | undefined {
    return activeUpcoming.find((sale) => isLotEligible(horse, sale.kind));
  }

  const consignablePairs = playerHorses
    .map((h: Horse) => ({ horse: h, sale: findEligibleSale(h) }))
    .filter((p: any): p is { horse: Horse; sale: AuctionSale } => p.sale !== undefined);

  function openConsign(horse: Horse, sale: AuctionSale) {
    setConsignTarget({ horse, sale });
    setConsignOpen(true);
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Auction Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Gavel className="h-3.5 w-3.5" />
            Public Sales
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            The Auction Block
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>Active Windows: <NumericValue value={activeUpcoming.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Commission Rate: <NumericValue value={Math.round(CONSIGNMENT_COMMISSION * 100)} />%</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Exchange: <span className="text-success font-black">Open</span></span>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-gold/30 text-gold-muted bg-gold/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            Buyer Access
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6">
          <ConsignmentSidebar consignablePairs={consignablePairs} onConsign={openConsign} />
          <TransactionArchive pastSales={past} />
        </aside>

        <main className="lg:col-span-8 space-y-8">
          <LiveExchangeFloor sales={todaysSales} />
          <UpcomingLedgerTable sales={allUpcoming as any} currentDay={day} />
        </main>
      </div>

      {consignTarget && (
        <ConsignDialog
          horse={consignTarget.horse}
          sale={consignTarget.sale}
          open={consignOpen}
          onOpenChange={(open) => {
            setConsignOpen(open);
            if (!open) setConsignTarget(null);
          }}
        />
      )}
    </div>
  );
}
