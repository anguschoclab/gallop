/**
 * CatalogIndex.tsx - Auction catalog index sidebar
 *
 * Left sidebar with search, filters, and lot list. Extracted from auction.$saleId.tsx.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { AuctionFilterBar } from "./AuctionFilterBar";
import type { AuctionLot, Horse } from "@/game/types";
import type { AuctionBrowseSearch } from "@/constants/auctionSearchSchema";

interface CatalogIndexProps {
  displayLots: AuctionLot[];
  lotIndex: number;
  horseMap: Map<string, Horse>;
  isResolved: boolean;
  filters: AuctionBrowseSearch;
  hasActiveFilters: boolean;
  onSelectLot: (index: number) => void;
  onUpdateFilter: (
    update: Partial<AuctionBrowseSearch> | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch)
  ) => void;
  onResetFilters: () => void;
  searchDraft: string;
  setSearchDraft: (q: string) => void;
}

function ageLabel(horse: Horse): string {
  if (horse.age === 0) return "Weanling";
  if (horse.age === 1) return "Yearling";
  if (horse.age === 2) return "2YO";
  if (horse.gender === "mare") return `Broodmare (${Math.floor(horse.age)})`;
  return `${Math.floor(horse.age)}YO`;
}

export function CatalogIndex({
  displayLots,
  lotIndex,
  horseMap,
  isResolved,
  filters,
  hasActiveFilters,
  onSelectLot,
  onUpdateFilter,
  onResetFilters,
  searchDraft,
  setSearchDraft,
}: CatalogIndexProps) {
  return (
    <aside className="lg:col-span-4 space-y-8">
      {!isResolved && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Search className="h-3.5 w-3.5 text-gold/60" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
              Catalog Search
            </h2>
          </div>
          <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40">
            <CardContent className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                <Input
                  placeholder="Horse or sire name..."
                  className="h-10 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-gold/30"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <AuctionFilterBar
                search={filters}
                hasActiveFilters={hasActiveFilters}
                onUpdateFilter={onUpdateFilter}
                onReset={onResetFilters}
              />
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <History className="h-3.5 w-3.5 text-cream/30" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
            Catalog Index
          </h2>
        </div>
        <div className="border border-white/5 bg-slate-900/40 shadow-xl max-h-[600px] overflow-y-auto custom-scrollbar">
          <div className="divide-y divide-white/5">
            {displayLots.map((lot, idx) => {
              const lotHorse = horseMap.get(lot.horseId);
              const isActive = idx === lotIndex;
              return (
                <div
                  key={lot.id}
                  onClick={() => {
                    onSelectLot(idx);
                  }}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-all flex items-center justify-between group",
                    isActive
                      ? "bg-gold/10 border-l-2 border-l-gold"
                      : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-cream/20 group-hover:text-gold/40 transition-colors">
                        #{String(idx + 1).padStart(3, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold uppercase tracking-tight transition-colors",
                          isActive ? "text-gold" : "text-cream/60 group-hover:text-cream"
                        )}
                      >
                        {lotHorse?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="text-[8px] font-mono text-cream/20 uppercase tracking-tighter">
                      {lotHorse ? `${ageLabel(lotHorse)} · ${lotHorse.gender}` : "NA"}
                    </div>
                  </div>
                  <div className="text-right">
                    {lot.hammerPrice && (
                      <div
                        className={cn(
                          "text-[10px] font-mono font-bold tabular-nums",
                          lot.passed ? "text-destructive/40" : "text-success/60"
                        )}
                      >
                        {formatCurrency(lot.hammerPrice)}
                      </div>
                    )}
                    {lot.passed && (
                      <span className="text-[8px] font-black uppercase text-destructive/60 tracking-widest leading-none">
                        PASSED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </aside>
  );
}
