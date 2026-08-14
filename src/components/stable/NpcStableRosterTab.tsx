import { TOOLTIP_DELAY_MS } from "@/constants";
import { type MouseEvent, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, HandCoins } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

function DisabledTooltipWrapper({
  reason,
  children,
}: {
  reason?: string | false;
  children: React.ReactNode;
}) {
  if (!reason) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-block cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
import { HorseCard } from "@/components/horse/HorseCard";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import { overall } from "@/components/horse/HorseBits";
import { calculateScoutCost } from "@/core/npc/scouting";
import { formatCurrency } from "@/core/common/formatting";
import { toast } from "sonner";
import type { Horse, PrivateSaleOffer } from "@/game/types";
import type { useNpcStableDetail } from "@/hooks/stable/useNpcStableDetail";

interface NpcStableRosterTabProps {
  pageData: ReturnType<typeof useNpcStableDetail>;
}

export function NpcStableRosterTab({ pageData }: NpcStableRosterTabProps) {
  const {
    stable,
    stableHorses,
    day,
    cash,
    privateSaleOffers,
    scoutHorse,
    respondToPrivateSale,
    setOfferHorse,
  } = pageData;

  if (!stable) return null;

  // Pre-calculate hash map for O(1) active offer lookups instead of running O(N) .find() inside the map loop.
  // Reduces time complexity from O(Horses * Offers) to O(Horses + Offers).
  const activeOffersMap = useMemo(() => {
    const map = new Map<string, PrivateSaleOffer>();
    privateSaleOffers.forEach((o: PrivateSaleOffer) => {
      if (o.fromStableId === undefined && (o.status === "pending" || o.status === "countered")) {
        map.set(o.horseId, o);
      }
    });
    return map;
  }, [privateSaleOffers]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stableHorses
          .sort((a: Horse, b: Horse) => overall(b) - overall(a))
          .map((horse: Horse) => {
            const scoutCost = calculateScoutCost(horse, stable);
            const canScout = !horse.lastScoutedDay || day - horse.lastScoutedDay > 0;

            const activeOffer = activeOffersMap.get(horse.id);
            const hasInAuction = !!horse.consignedSaleId;

            const handleScout = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const result = scoutHorse(horse.id);
              if (result.success) toast.success(result.message);
              else toast.error(result.message);
            };

            return (
              <div key={horse.id} className="relative group min-w-0">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors z-10" />

                <Link to="/stable/$horseId" params={{ horseId: horse.id }} className="block">
                  <HorseCard
                    horse={horse}
                    variant="scout"
                    showScoutInfo
                    className="hover:border-blue-500/40"
                  />
                </Link>

                <div className="mt-2 flex flex-wrap gap-2 justify-end">
                  <DisabledTooltipWrapper
                    reason={
                      hasInAuction
                        ? "Horse is currently in auction"
                        : activeOffer
                          ? "Offer already pending"
                          : false
                    }
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOfferHorse(horse);
                      }}
                      disabled={!!activeOffer || hasInAuction}
                      className={cn(
                        "h-7 px-3 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-gold/10 hover:text-gold hover:border-gold/30 rounded-none bg-slate-950/80 backdrop-blur-sm text-cream/60",
                        (!!activeOffer || hasInAuction) && "pointer-events-none",
                      )}
                    >
                      <HandCoins className="w-3 h-3 mr-1.5" />
                      {activeOffer ? "PENDING" : "OFFER"}
                    </Button>
                  </DisabledTooltipWrapper>
                  {canScout && (
                    <DisabledTooltipWrapper
                      reason={cash < scoutCost ? "Not enough cash to scout" : false}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleScout}
                        disabled={cash < scoutCost}
                        className={cn(
                          "h-7 px-3 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/30 rounded-none bg-slate-950/80 backdrop-blur-sm text-cream/60",
                          cash < scoutCost && "pointer-events-none",
                        )}
                      >
                        <Eye className="w-3 h-3 mr-1.5" />
                        SCOUT · -{formatCurrency(scoutCost)}
                      </Button>
                    </DisabledTooltipWrapper>
                  )}
                </div>

                {activeOffer && (
                  <div className="mt-2">
                    <PrivateSaleCounterCard
                      offer={activeOffer}
                      horse={horse}
                      stable={stable}
                      cash={cash}
                      onRespond={respondToPrivateSale}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>
      {stableHorses.length === 0 && (
        <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
          <ShieldCheck className="h-16 w-16 mx-auto mb-6 text-cream/5" />
          <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
            No Horses
          </p>
        </div>
      )}
    </div>
  );
}
