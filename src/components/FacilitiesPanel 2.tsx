import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/game/store";
import {
  FACILITY_UPGRADE_COSTS,
  FACILITY_ENABLED_WORKOUTS,
  type FacilityType,
  type FacilityLevel,
} from "@/core/facilities";
import { ArrowUp, Check, X, Dumbbell } from "lucide-react";

/**
 * Facilities Panel Component
 * Displays player's facilities and allows upgrading them
 */
export function FacilitiesPanel() {
  const { facilities, cash, upgradeFacility, day } = useGame((s) => ({
    facilities: s.facilities,
    cash: s.cash,
    upgradeFacility: s.upgradeFacility,
    day: s.day,
  }));

  if (!facilities) {
    return null;
  }

  const facilityTypes: FacilityType[] = [
    "main_track",
    "barn",
    "exercise_pool",
    "treadmill",
    "veterinary_clinic",
    "starting_gates",
    "transport",
    "spa",
    "nutrition_lab",
    "rehab_center",
  ];

  const FACILITY_LEVELS: FacilityLevel[] = ["basic", "standard", "premium", "elite"];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "basic":
        return "bg-t600";
      case "standard":
        return "bg-info";
      case "premium":
        return "bg-chart-4";
      case "elite":
        return "bg-gold";
      default:
        return "bg-t600";
    }
  };

  const handleUpgrade = (facilityType: FacilityType) => {
    const result = upgradeFacility(facilityType);
    if (!result.ok) {
      alert(result.reason);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Facilities</h2>
          <p className="text-sm text-cream-muted">
            Upgrade your facilities to improve training and operations
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cream-muted">Available Cash</p>
          <p className="text-2xl font-bold">${cash.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilityTypes.map((type) => {
          const facility = facilities[type];
          if (!facility) return null;

          const currentLevelIndex = FACILITY_LEVELS.indexOf(facility.level);
          const maxLevel = currentLevelIndex >= FACILITY_LEVELS.length - 1;
          const upgradeCost = facility.upgradeCost;
          const canAfford = cash >= upgradeCost;

          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{type.replace(/_/g, " ")}</CardTitle>
                  <Badge className={getLevelColor(facility.level)}>{facility.level}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance Cost</span>
                    <span>${facility.maintenanceCost.toLocaleString()}/day</span>
                  </div>
                  {!maxLevel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Upgrade Cost</span>
                      <span className="font-semibold">${upgradeCost.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Display enabled workouts */}
                {FACILITY_ENABLED_WORKOUTS[type] && FACILITY_ENABLED_WORKOUTS[type].length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Dumbbell className="h-3 w-3" />
                      <span>Enables:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {FACILITY_ENABLED_WORKOUTS[type].map((workout) => (
                        <Badge key={workout} variant="outline" className="text-[10px] capitalize">
                          {workout.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {maxLevel ? (
                  <div className="flex items-center gap-2 text-sm text-cream-muted">
                    <Check className="h-4 w-4 text-success" />
                    <span>Maximum level reached</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(type)}
                    disabled={!canAfford}
                    className="w-full"
                    size="sm"
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Upgrade to {FACILITY_LEVELS[currentLevelIndex + 1]}
                  </Button>
                )}

                {!maxLevel && !canAfford && (
                  <div className="flex items-center gap-2 text-xs text-cream-muted">
                    <X className="h-3 w-3" />
                    <span>Insufficient funds</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
