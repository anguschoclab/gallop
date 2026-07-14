import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { TRAINING_COST } from "@/constants";
import { BASIC_TRAINING_TYPES, ADVANCED_WORKOUTS } from "@/constants/trainingTypes";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";
import { getAvailableTrainingTypes } from "@/core/facilities";
import { FACILITY_NAMES, facilityLevelToTierLabel } from "@/core/facilities/facilityTypes";
import type { Horse, PlayerFacilities } from "@/game/types";
import { useCallback, memo, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

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

// Helper to conditionally wrap button with tooltip if disabled
function DisabledTooltipWrapper({
  reason,
  children,
}: {
  reason?: string;
  children: React.ReactNode;
}) {
  if (!reason) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-block w-full cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
          disabledReason: isPregnant
            ? "Horse is pregnant"
            : slotsLeft <= 0
              ? "No training slots left today"
              : cash < TRAINING_COST
                ? "Not enough cash"
                : horse.energy < 15
                  ? "Not enough energy"
                  : val >= horse.potential
                    ? "Maximum potential reached"
                    : undefined,
          label: k,
          nextValue: Math.min(horse.potential, val + 1),
          currentValue: val,
          onClick: () => handleTrainingClick(k),
        };
      }),
    [isPregnant, slotsLeft, cash, horse, handleTrainingClick],
  );

  const availableTypes = useMemo(
    () =>
      facilities
        ? getAvailableTrainingTypes(facilities)
        : ["speed", "stamina", "acceleration", "rest"],
    [facilities],
  );

  // Memoize advanced workouts array to prevent recreation
  const advancedWorkoutButtons = useMemo(
    () =>
      ADVANCED_WORKOUTS.map((workout) => {
        const isEnabled = availableTypes.includes(workout.key);
        const isStatCapped =
          workout.stat !== undefined && getStatValue(horse.stats, workout.stat) >= horse.potential;
        const req = TRAINING_FACILITY_REQUIREMENTS[workout.key];
        const unlockHint =
          !isEnabled && req
            ? `Requires ${FACILITY_NAMES[req.facilityType]} (${facilityLevelToTierLabel(req.minLevel)})`
            : undefined;

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
          disabledReason: !isEnabled
            ? unlockHint
            : isPregnant
              ? "Horse is pregnant"
              : slotsLeft <= 0
                ? "No training slots left today"
                : cash < workout.cost
                  ? "Not enough cash"
                  : horse.energy < workout.energy
                    ? "Not enough energy"
                    : isStatCapped
                      ? "Maximum potential reached"
                      : undefined,
          label: workout.label,
          cost: workout.cost,
          isEnabled,
          unlockHint,
          onClick: () => handleTrainingClick(workout.key),
        };
      }),
    [availableTypes, horse, isPregnant, slotsLeft, cash, handleTrainingClick],
  );

  return (
    <div className="space-y-2">
      {/* Basic training types */}
      {basicTrainingButtons.map((btn) => (
        <DisabledTooltipWrapper key={btn.key} reason={btn.disabledReason}>
          <Button
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={cn("w-full justify-between", btn.disabled && "pointer-events-none")}
            variant="outline"
          >
            <span className="capitalize">{btn.label} work</span>
            <span className="text-cream-muted">
              {btn.currentValue} → {btn.nextValue}
            </span>
          </Button>
        </DisabledTooltipWrapper>
      ))}

      {/* Advanced workout types */}
      <div className="pt-2 border-t border-gold-muted/30">
        <p className="text-xs text-cream-muted mb-2">{ADVANCED_WORKOUTS_LABEL}</p>
        <div className="grid grid-cols-2 gap-2">
          {advancedWorkoutButtons.map((btn) => (
            <DisabledTooltipWrapper key={btn.key} reason={btn.disabledReason}>
              <Button
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={cn(
                  "w-full justify-between text-xs",
                  btn.disabled && "pointer-events-none",
                )}
                variant="outline"
              >
                <div className="flex items-center gap-1">
                  {!btn.isEnabled ? <Lock className="h-3 w-3" /> : null}
                  <span>{btn.label}</span>
                </div>
                <span className="text-cream-muted">${btn.cost}</span>
              </Button>
            </DisabledTooltipWrapper>
          ))}
        </div>
      </div>

      <DisabledTooltipWrapper
        reason={
          isPregnant
            ? "Horse is pregnant"
            : slotsLeft <= 0
              ? "No training slots left today"
              : horse.energy >= 100
                ? "Horse is fully rested"
                : undefined
        }
      >
        <Button
          onClick={handleRest}
          disabled={isPregnant || slotsLeft <= 0 || horse.energy >= 100}
          className={cn(
            "w-full",
            (isPregnant || slotsLeft <= 0 || horse.energy >= 100) && "pointer-events-none",
          )}
          variant="secondary"
        >
          {REST_LABEL}
        </Button>
      </DisabledTooltipWrapper>
    </div>
  );
}

export const TrainingPanel = memo(TrainingPanelComponent);
