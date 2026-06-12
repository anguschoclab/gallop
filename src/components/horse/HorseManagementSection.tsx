import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Tag, Scissors, Edit, DollarSign } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { AuctionSale } from "@/game/types";
import { useGame } from "@/game/store";
import { toast } from "sonner";

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
  const geldingHorse = useGame((s) => s.geldingHorse);
  const renameHorse = useGame((s) => s.renameHorse);
  const updateStudFee = useGame((s) => s.updateStudFee);

  if (!horse.owned) return null;

  const handleGelding = () => {
    if (confirm(`Geld ${horse.name}? This cannot be undone.`)) {
      const result = geldingHorse(horse.id);
      if (result.ok) {
        toast.success("Horse gelded successfully", { duration: 3000 });
      } else {
        toast.error(result.reason, { duration: 3000 });
      }
    }
  };

  const handleRename = () => {
    const newName = prompt(`Enter new name for ${horse.name}:`);
    if (newName && newName.trim()) {
      const result = renameHorse(horse.id, newName.trim());
      if (result.ok) {
        toast.success("Horse renamed successfully", { duration: 3000 });
      } else {
        toast.error(result.reason, { duration: 3000 });
      }
    }
  };

  const handleUpdateStudFee = () => {
    const newFee = prompt(
      `Enter new stud fee for ${horse.name} (current: $${horse.stud?.fee || 0}):`,
    );
    if (newFee && !isNaN(Number(newFee))) {
      const result = updateStudFee(horse.id, Number(newFee));
      if (result.ok) {
        toast.success("Stud fee updated successfully", { duration: 3000 });
      } else {
        toast.error(result.reason, { duration: 3000 });
      }
    }
  };

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

          {/* Management Actions */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 mb-2">
              Management Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleRename}
                variant="outline"
                size="sm"
                className="h-8 text-[9px] font-black uppercase border-white/10 hover:bg-white/5 text-cream"
              >
                <Edit className="h-3 w-3 mr-1" /> Rename
              </Button>
              {horse.sex === "colt" && !horse.isGelded && (
                <Button
                  onClick={handleGelding}
                  variant="outline"
                  size="sm"
                  className="h-8 text-[9px] font-black uppercase border-red-400/30 hover:bg-red-400/10 text-red-400"
                >
                  <Scissors className="h-3 w-3 mr-1" /> Geld
                </Button>
              )}
              {horse.stud?.atStud && (
                <Button
                  onClick={handleUpdateStudFee}
                  variant="outline"
                  size="sm"
                  className="h-8 text-[9px] font-black uppercase border-gold/30 hover:bg-gold/10 text-gold"
                >
                  <DollarSign className="h-3 w-3 mr-1" /> Update Fee
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
