import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FACILITY_ENABLED_WORKOUTS, type FacilityType } from "@/core/facilities";
import { ArrowUp, Check, HardDrive } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import { useFacilityTiers } from "@/hooks/facilities/useFacilityTiers";

interface FacilityCategoryProps {
  category: string;
  icon: React.ElementType;
  color: string;
  types: FacilityType[];
  facilities: Record<string, any>;
  cash: number;
  onUpgrade: (type: FacilityType) => void;
}

export function FacilityCategory({
  category,
  icon: Icon,
  color,
  types,
  facilities,
  cash,
  onUpgrade,
}: FacilityCategoryProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
        <Icon className={cn("h-4 w-4", color)} />
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-cream/60">{category}</h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => {
          const facility = facilities[type];
          if (!facility) return null;

          const { maxLevel, canAfford, rankVal } = useFacilityTiers(facility, cash);

          return (
            <Card
              key={type}
              className="bg-slate-900/40 border-white/5 rounded-none group hover:border-white/20 transition-all duration-300 relative overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-white/5 group-hover:bg-gold/40 transition-colors" />

              <CardHeader className="pb-3 bg-black/20 border-b border-white/5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-cream group-hover:text-gold transition-colors leading-none">
                      {type.replace(/_/g, " ")}
                    </CardTitle>
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 w-3 rounded-full",
                            i <= rankVal
                              ? "bg-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                              : "bg-white/5",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[8px] font-black uppercase tracking-widest h-5 rounded-none px-2",
                      rankVal === 4
                        ? "border-gold text-gold bg-gold/5"
                        : "border-white/10 text-cream/40",
                    )}
                  >
                    RANK_0{rankVal}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                      Maintenance
                    </div>
                    <div className="text-xs font-mono font-bold text-cream/60 tabular-nums">
                      -{formatCurrency(facility.maintenanceCost)}
                      <span className="text-[8px] opacity-40">/D</span>
                    </div>
                  </div>
                  {!maxLevel && (
                    <div className="space-y-1 text-right">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
                        Upgrade Cost
                      </div>
                      <div
                        className={cn(
                          "text-xs font-mono font-bold tabular-nums",
                          canAfford ? "text-success" : "text-destructive/60",
                        )}
                      >
                        {formatCurrency(facility.upgradeCost)}
                      </div>
                    </div>
                  )}
                </div>

                {FACILITY_ENABLED_WORKOUTS[type] && FACILITY_ENABLED_WORKOUTS[type].length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[8px] font-black uppercase text-cream/20 tracking-[0.2em] flex items-center gap-1.5 px-1">
                      <HardDrive className="h-2.5 w-2.5 opacity-40" />
                      Enabled_Specs
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {FACILITY_ENABLED_WORKOUTS[type].map((workout: string) => (
                        <div
                          key={workout}
                          className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-cream/60 uppercase tracking-tighter rounded-sm"
                        >
                          {workout.replace("_", " ")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {maxLevel ? (
                    <div className="flex items-center justify-center gap-2 p-2 bg-success/5 border border-success/20">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-success">
                        Optimal Performance
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={() => onUpgrade(type)}
                        disabled={!canAfford}
                        variant={canAfford ? "default" : "outline"}
                        className={cn(
                          "w-full h-10 uppercase text-[10px] font-black tracking-[0.2em] rounded-none transition-all",
                          canAfford
                            ? "bg-gold hover:bg-gold-bright text-slate-950 shadow-lg"
                            : "border-white/5 text-cream/20 bg-transparent",
                        )}
                      >
                        <ArrowUp className="h-3 w-3 mr-2" />
                        Provision Level_{rankVal + 1}
                      </Button>
                      {!canAfford && (
                        <p className="text-center text-[8px] font-black uppercase text-destructive/40 tracking-tighter animate-pulse">
                          Insufficient Capital Reserves
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
