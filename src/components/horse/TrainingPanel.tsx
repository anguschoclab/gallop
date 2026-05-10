import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { TRAINING_COST } from "@/game/constants/gameConstants";
import { isWorkoutEnabled } from "@/core/facilities";
import type { Horse, PlayerFacilities } from "@/game/types";

/**
 * Props for the TrainingPanel component.
 */
interface TrainingPanelProps {
  /** The horse to be trained. */
  horse: Horse;
  /** Whether the horse is currently pregnant. */
  isPregnant: boolean;
  /** Number of training slots left for today. */
  slotsLeft: number;
  /** Player's current cash balance. */
  cash: number;
  /** Current facility state to check for unlocked workouts. */
  facilities: PlayerFacilities | null;
  /** Callback function to trigger a training session. */
  onTrain: (horseId: string, type: any) => void;
}

/**
 * Component to render the horse training management interface.
 *
 * EXTRACTED FROM: src/routes/stable.$horseId.tsx
 */
export function TrainingPanel({
  horse,
  isPregnant,
  slotsLeft,
  cash,
  facilities,
  onTrain,
}: TrainingPanelProps) {
  const basicTrainingTypes = ["speed", "stamina", "acceleration"] as const;

  type AdvancedWorkout = {
    key: string;
    label: string;
    cost: number;
    energy: number;
    stat?: string;
  };

  const advancedWorkouts: AdvancedWorkout[] = [
    { key: "bullet", label: "Bullet", cost: 100, energy: 25, stat: "speed" },
    { key: "breeze", label: "Breeze", cost: 85, energy: 20 },
    { key: "gate_work", label: "Gate Work", cost: 90, energy: 22 },
    { key: "swimming", label: "Swimming", cost: 80, energy: 15 },
    { key: "gallop", label: "Gallop", cost: 70, energy: 16 },
  ];

  return (
    <div className="space-y-2">
      {/* Basic training types */}
      {basicTrainingTypes.map((k) => (
        <Button
          key={k}
          onClick={() => onTrain(horse.id, k)}
          disabled={
            isPregnant ||
            slotsLeft <= 0 ||
            cash < TRAINING_COST ||
            horse.energy < 15 ||
            horse.stats[k] >= horse.potential
          }
          className="w-full justify-between"
          variant="outline"
        >
          <span className="capitalize">{k} work</span>
          <span className="text-cream-muted">
            {horse.stats[k]} → {Math.min(horse.potential, horse.stats[k] + 1)}
          </span>
        </Button>
      ))}

      {/* Advanced workout types */}
      <div className="pt-2 border-t border-gold-muted/30">
        <p className="text-xs text-cream-muted mb-2">Advanced Workouts</p>
        <div className="grid grid-cols-2 gap-2">
          {advancedWorkouts.map((workout) => {
            const isEnabled = facilities && isWorkoutEnabled(facilities, workout.key as any);
            const isStatCapped =
              workout.stat !== undefined &&
              horse.stats[workout.stat as keyof typeof horse.stats] >= horse.potential;

            return (
              <Button
                key={workout.key}
                onClick={() => onTrain(horse.id, workout.key)}
                disabled={
                  isPregnant ||
                  slotsLeft <= 0 ||
                  cash < workout.cost ||
                  horse.energy < workout.energy ||
                  isStatCapped ||
                  !isEnabled
                }
                className="w-full justify-between text-xs"
                variant="outline"
              >
                <div className="flex items-center gap-1">
                  {!isEnabled ? <Lock className="h-3 w-3" /> : null}
                  <span>{workout.label}</span>
                </div>
                <span className="text-cream-muted">${workout.cost}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={() => onTrain(horse.id, "rest")}
        disabled={isPregnant || slotsLeft <= 0 || horse.energy >= 100}
        className="w-full"
        variant="secondary"
      >
        Rest (+30 energy)
      </Button>
    </div>
  );
}
