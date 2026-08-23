import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SilkDot } from "@/components/SilkDot";
import { CONSIGNMENT_COMMISSION } from "@/constants";
import { Package, Lock } from "lucide-react";
import type { Horse, AuctionSale } from "@/game/types";

interface ConsignmentSidebarProps {
  consignablePairs: Array<{ horse: Horse; sale: AuctionSale }>;
  onConsign: (horse: Horse, sale: AuctionSale) => void;
  saleAccessMap?: Map<string, { allowed: boolean; requiredTier: string }>;
}

function ageLabel(horse: Horse): string {
  if (horse.age === 0) return "Weanling";
  if (horse.age === 1) return "Yearling";
  if (horse.age === 2) return "2YO";
  if (horse.gender === "mare") return `Broodmare (${Math.floor(horse.age)})`;
  return `${Math.floor(horse.age)}YO`;
}

export function ConsignmentSidebar({
  consignablePairs,
  onConsign,
  saleAccessMap,
}: ConsignmentSidebarProps) {
  return (
    <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Package className="h-3.5 w-3.5 text-gold/60" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
            Consign to Sale
          </h2>
        </div>
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40">
          <CardHeader className="pb-2 border-b border-white/5 bg-black/20">
            <div className="flex justify-between items-center">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                Eligible Horses
              </CardTitle>
              <span className="text-[9px] font-mono text-gold-bright font-black uppercase">
                Available: {consignablePairs.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
              {consignablePairs.map(({ horse, sale }, i) => {
                const access = saleAccessMap?.get(sale.kind);
                const isLocked = access && !access.allowed;
                return (
                  <div key={horse.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <SilkDot color={horse.silk} size="sm" />
                        <span className="font-bold text-cream uppercase tracking-tight text-xs group-hover:text-gold transition-colors">
                          {horse.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isLocked && (
                          <Badge
                            variant="outline"
                            className="h-4 text-[8px] border-red-400/30 text-red-400/80 font-mono gap-0.5"
                          >
                            <Lock className="h-2 w-2" />
                            {access!.requiredTier}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="h-4 text-[8px] border-white/10 text-cream/40 font-mono"
                        >
                          D{sale.day}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-mono text-cream/20 uppercase tracking-tighter">
                        {ageLabel(horse)} · {horse.gender}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[9px] font-black uppercase border border-gold/20 hover:bg-gold/10 text-gold"
                        onClick={() => onConsign(horse, sale)}
                      >
                        CONSIGN
                      </Button>
                    </div>
                  </div>
                );
              })}
              {consignablePairs.length === 0 && (
                <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                  No assets ready for deployment
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-3 bg-black/40 border-t border-white/5 text-center">
            <p className="text-[8px] font-mono text-cream/20 uppercase">
              House Commission Fixed at {Math.round(CONSIGNMENT_COMMISSION * 100)}%
            </p>
          </div>
        </Card>
      </section>
    </aside>
  );
}
