import { useGame, useGameWithShallow } from "@/game/store";
import { FacilityCategory } from "./FacilityCategory";
import { Dumbbell, ShieldCheck, Activity, Package } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import {
  FACILITY_BONUSES,
  FACILITY_MAINTENANCE_COSTS,
  FACILITY_UPGRADE_COSTS,
  FACILITY_TIER_LABELS,
  type FacilityLevel,
  type FacilityType,
} from "@/core/facilities";
import { FACILITY_LEVELS } from "@/hooks/facilities/useFacilityTiers";

function TierLegend() {
  const tiers = FACILITY_LEVELS;

  return (
    <div className="bg-black/40 border border-white/5 p-4">
      <div className="text-[8px] font-black uppercase text-cream/20 tracking-[0.3em] mb-3">
        Tier Reference
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiers.map((level) => {
          const bonus = FACILITY_BONUSES[level];
          const maintenance = FACILITY_MAINTENANCE_COSTS[level];
          const upgradeCost = FACILITY_UPGRADE_COSTS[level];
          return (
            <div key={level} className="border border-white/5 p-2 space-y-1">
              <div className="text-[9px] font-black uppercase text-gold tracking-widest">
                {FACILITY_TIER_LABELS[level]}
              </div>
              <div className="text-[8px] font-mono text-cream/60 tabular-nums">
                {bonus === 0 ? "0%" : `+${bonus * 100}%`}
              </div>
              <div className="text-[8px] font-mono text-cream/40 tabular-nums">
                {formatCurrency(maintenance)}/day
              </div>
              <div className="text-[8px] font-mono text-cream/40 tabular-nums">
                {upgradeCost === null ? "Max" : formatCurrency(upgradeCost)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Facilities Panel Component
 * Redesigned for the "Infrastructure Registry" aesthetic
 */
export function FacilitiesPanel() {
  const facilities = useGameWithShallow((s) => s.facilities);
  const cash = useGame((s) => s.cash);
  const upgradeFacility = useGame((s) => s.upgradeFacility);

  if (!facilities) {
    return null;
  }

  const facilityCategories: {
    name: string;
    types: FacilityType[];
    icon: React.ElementType;
    color: string;
  }[] = [
    {
      name: "Physical Optimization",
      types: ["main_track", "starting_gates", "treadmill", "exercise_pool"],
      icon: Dumbbell,
      color: "text-gold",
    },
    {
      name: "Medical & Wellness",
      types: ["veterinary_clinic", "rehab_center", "spa", "nutrition_lab"],
      icon: Activity,
      color: "text-blue-400",
    },
    {
      name: "Logistics & Housing",
      types: ["barn", "transport"],
      icon: Package,
      color: "text-success",
    },
  ];

  const handleUpgrade = (facilityType: FacilityType) => {
    const result = upgradeFacility(facilityType);
    if (!result.ok) {
      alert(result.reason);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between bg-black/40 p-6 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
        <div className="relative z-10">
          <h2 className="text-xl font-black font-[family-name:var(--font-display)] text-cream uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            Infrastructure Liquidity
          </h2>
          <p className="text-[10px] font-mono text-cream/40 uppercase tracking-tighter mt-1">
            Available operational capital for asset upgrades
          </p>
        </div>
        <div className="relative z-10 text-right">
          <div className="text-[10px] font-mono text-gold-muted/60 uppercase font-black tracking-widest mb-1">
            Cash on Hand
          </div>
          <div className="text-3xl font-black font-mono text-success tabular-nums leading-none tracking-tighter">
            {formatCurrency(cash)}
          </div>
        </div>
      </div>

      <TierLegend />

      {facilityCategories.map((cat) => (
        <FacilityCategory
          key={cat.name}
          category={cat.name}
          icon={cat.icon}
          color={cat.color}
          types={cat.types}
          facilities={facilities}
          cash={cash}
          onUpgrade={handleUpgrade}
        />
      ))}
    </div>
  );
}
