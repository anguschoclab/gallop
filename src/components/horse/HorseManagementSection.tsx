import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { AuctionSale } from "@/game/types";

interface HorseManagementSectionProps {
  horse: any;
  isConsigned: boolean;
  consignedSale?: AuctionSale;
  eligibleSale?: AuctionSale;
  day: number;
}

export function HorseManagementSection({
  horse,
  isConsigned,
  consignedSale,
  eligibleSale,
  day,
}: HorseManagementSectionProps) {
  if (!horse.owned) return null;

  return (
    <section id="management" className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-purple-400" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Racing &amp; Status
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
        <CardContent className="p-6 space-y-4">
          {isConsigned && consignedSale ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-gold" />
                <span className="text-sm font-bold text-cream">Consigned to Auction</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Sale
                  </span>
                  <span className="font-mono text-cream">{consignedSale.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Day
                  </span>
                  <span className="font-mono text-cream">{consignedSale.day}</span>
                </div>
              </div>
              <Link
                to="/auction/$saleId"
                params={{ saleId: consignedSale.id }}
                className="text-blue-400 text-xs hover:underline"
              >
                View sale →
              </Link>
            </div>
          ) : eligibleSale ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-cream/40" />
                <span className="text-sm font-bold text-cream">Eligible for Upcoming Sale</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Sale
                  </span>
                  <span className="font-mono text-cream">{eligibleSale.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Day
                  </span>
                  <span className="font-mono text-cream">{eligibleSale.day}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-cream/30 font-mono italic">No auction activity.</div>
          )}

          <div className="pt-4 border-t border-white/5 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                Career Starts
              </span>
              <span className="font-mono text-cream">{horse.raceHistory?.length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                Career Earnings
              </span>
              <span className="font-mono text-success">
                ${(horse.earnings ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
