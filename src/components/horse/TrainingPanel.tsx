import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { TRAINING_COST } from "@/constants";
import { BASIC_TRAINING_TYPES, ADVANCED_WORKOUTS } from "@/constants/trainingTypes";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";
import { getAvailableTrainingTypes } from "@/core/facilities";
import { FACILITY_NAMES } from "@/core/facilities/facilityTypes";
import type { Horse, PlayerFacilities } from "@/game/types";
import { useCallback, memo, useMemo } from "react";

interface TrainingPanelProps {
  horse: Horse;
  isPregnant: boolean;
  slotsLeft: number;
  cash: number;
  facilities: PlayerFacilities | null | undefined;
  onTrain: (horseId: string, type: any) => void;
}

function getStatValue(stats: Horse["stats"], key: string): number {
  if (key === "speed") return stats.speed;
  if (key === "stamina") return stats.stamina;
  if (key === "acceleration") return stats.acceleration;
  if (key === "consistency") return stats.consistency;
  return 50;
}

const ADVANCED_WORKOUTS_LABEL = "Advanced Workouts";
const REST_LABEL = "Rest (+30 energy)";

export function TrainingPanelComponent({
  horse,
  isPregnant,
  slotsLeft,
  cash,
  facilities,
  onTrain,
}: TrainingPanelProps) {
  const handleRest = useCallback(() => {
    onTrain(horse.id, "rest");
  }, [horse.id, onTrain]);

  // Single handler for all training buttons
  const handleTrainingClick = useCallback(
    (type: string) => {
      onTrain(horse.id, type);
    },
    [horse.id, onTrain],
  );

  // Memoize the training types arrays to prevent recreation
  const basicTrainingButtons = useMemo(
    () =>
      BASIC_TRAINING_TYPES.map((k) => {
        const val = getStatValue(horse.stats, k);
        return {
          key: k,
          type: k,
          disabled:
            isPregnant ||
            slotsLeft <= 0 ||
            cash < TRAINING_COST ||
            horse.energy < 15 ||
            val >= horse.potential,
          label: k,
          nextValue: Math.min(horse.potential, val + 1),
          currentValue: val,
          onClick: () => handleTrainingClick(k),
        };
      }),
    [isPregnant, slotsLeft, cash, horse, handleTrainingClick],
  );

  // Memoize advanced workouts array to prevent recreation
  const advancedWorkoutButtons = useMemo(
    () =>
      ADVANCED_WORKOUTS.map((workout) => {
        const isEnabled = facilities && isWorkoutEnabled(facilities, workout.key as any);
        const isStatCapped =
          workout.stat !== undefined && getStatValue(horse.stats, workout.stat) >= horse.potential;

        return {
          key: workout.key,
          type: workout.key,
          disabled:
            isPregnant ||
            slotsLeft <= 0 ||
            cash < workout.cost ||
            horse.energy < workout.energy ||
            isStatCapped ||
            !isEnabled,
          label: workout.label,
          cost: workout.cost,
          isEnabled,
          onClick: () => handleTrainingClick(workout.key),
        };
      }),
    [facilities, horse, isPregnant, slotsLeft, cash, handleTrainingClick],
  );

  return (
    <div className="space-y-2">
      {/* Basic training types */}
      {basicTrainingButtons.map((btn) => (
        <Button
          key={btn.key}
          onClick={btn.onClick}
          disabled={btn.disabled}
          className="w-full justify-between"
          variant="outline"
        >
          <span className="capitalize">{btn.label} work</span>
          <span className="text-cream-muted">
            {btn.currentValue} → {btn.nextValue}
          </span>
        </Button>
      ))}

      {/* Advanced workout types */}
      <div className="pt-2 border-t border-gold-muted/30">
        <p className="text-xs text-cream-muted mb-2">{ADVANCED_WORKOUTS_LABEL}</p>
        <div className="grid grid-cols-2 gap-2">
          {advancedWorkoutButtons.map((btn) => (
            <Button
              key={btn.key}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="w-full justify-between text-xs"
              variant="outline"
            >
              <div className="flex items-center gap-1">
                {!btn.isEnabled ? <Lock className="h-3 w-3" /> : null}
                <span>{btn.label}</span>
              </div>
              <span className="text-cream-muted">${btn.cost}</span>
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleRest}
        disabled={isPregnant || slotsLeft <= 0 || horse.energy >= 100}
        className="w-full"
        variant="secondary"
      >
        {REST_LABEL}
      </Button>
    </div>
  );
}

export const TrainingPanel = memo(TrainingPanelComponent);
