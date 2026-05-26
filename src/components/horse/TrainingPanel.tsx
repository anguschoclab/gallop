import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { TRAINING_COST, TRAINING_COST_MAP, TRAINING_ENERGY_MAP } from "@/game/constants";
import { isWorkoutEnabled } from "@/core/facilities";
import type { Horse, PlayerFacilities } from "@/game/types";
import { useCallback, memo, useMemo } from "react";

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
  /** Current cash available. */
  cash: number;
  /** Available facilities for advanced workouts. */
  facilities: PlayerFacilities | null;
  /** Callback function to trigger a training session. */
  onTrain: (horseId: string, type: any) => void;
}

/**
 * Memoized button component for training types to prevent re-creation
 */
const TrainingButton = memo(
  ({
    type,
    label,
    disabled,
    onClick,
    children,
  }: {
    type: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <Button
      key={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full justify-between"
      variant="outline"
    >
      {children}
    </Button>
  ),
);

/**
 * Component to render the horse training management interface.
 *
 * EXTRACTED FROM: src/routes/stable.$horseId.tsx
 */
export function TrainingPanelComponent({
  horse,
  isPregnant,
  slotsLeft,
  cash,
  facilities,
  onTrain,
}: TrainingPanelProps) {
  const basicTrainingTypes = ["speed", "stamina", "acceleration"] as const;

  const handleBasicTrain = useCallback(
    (k: (typeof basicTrainingTypes)[number]) => {
      onTrain(horse.id, k);
    },
    [horse.id, onTrain],
  );

  const handleAdvancedTrain = useCallback(
    (key: string) => {
      onTrain(horse.id, key);
    },
    [horse.id, onTrain],
  );

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

  type AdvancedWorkout = {
    key: string;
    label: string;
    cost: number;
    energy: number;
    stat?: string;
  };

  const advancedWorkouts: AdvancedWorkout[] = [
    { key: "bullet", label: "Bullet", cost: TRAINING_COST_MAP.bullet, energy: Math.abs(TRAINING_ENERGY_MAP.bullet), stat: "speed" },
    { key: "breeze", label: "Breeze", cost: TRAINING_COST_MAP.breeze, energy: Math.abs(TRAINING_ENERGY_MAP.breeze), stat: "stamina" },
    { key: "gate_work", label: "Gate Work", cost: TRAINING_COST_MAP.gate_work, energy: Math.abs(TRAINING_ENERGY_MAP.gate_work), stat: "acceleration" },
    { key: "swimming", label: "Swimming", cost: TRAINING_COST_MAP.swimming, energy: Math.abs(TRAINING_ENERGY_MAP.swimming) },
    { key: "gallop", label: "Gallop", cost: TRAINING_COST_MAP.gallop, energy: Math.abs(TRAINING_ENERGY_MAP.gallop) },
  ];

  // Memoize the training types arrays to prevent recreation
  const basicTrainingButtons = useMemo(
    () =>
      basicTrainingTypes.map((k) => ({
        key: k,
        type: k,
        disabled:
          isPregnant ||
          slotsLeft <= 0 ||
          cash < TRAINING_COST ||
          horse.energy < 15 ||
          horse.stats[k] >= horse.potential,
        label: k,
        nextValue: Math.min(horse.potential, horse.stats[k] + 1),
        currentValue: horse.stats[k],
        onClick: () => handleTrainingClick(k),
      })),
    [basicTrainingTypes, isPregnant, slotsLeft, cash, horse, handleTrainingClick],
  );

  // Memoize advanced workouts array to prevent recreation
  const advancedWorkoutButtons = useMemo(
    () =>
      advancedWorkouts.map((workout) => {
        const isEnabled = facilities && isWorkoutEnabled(facilities, workout.key as any);
        const isStatCapped =
          workout.stat !== undefined &&
          horse.stats[workout.stat as keyof typeof horse.stats] >= horse.potential;

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
    [advancedWorkouts, facilities, horse, isPregnant, slotsLeft, cash, handleTrainingClick],
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
        <p className="text-xs text-cream-muted mb-2">Advanced Workouts</p>
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
        Rest (+30 energy)
      </Button>
    </div>
  );
}

export const TrainingPanel = memo(TrainingPanelComponent);
