import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { TRAINING_COST, TOOLTIP_DELAY_MS } from "@/constants";
import { BASIC_TRAINING_TYPES, ADVANCED_WORKOUTS } from "@/constants/trainingTypes";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";
import { getAvailableTrainingTypes } from "@/core/facilities";
import { FACILITY_NAMES, facilityLevelToTierLabel } from "@/core/facilities/facilityTypes";
import type { Horse, PlayerFacilities } from "@/game/types";
import type { TrainingIntent } from "@/core/resolver/intents";
import { useCallback, memo, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface TrainingPanelProps {
  horse: Horse;
  isPregnant: boolean;
  slotsLeft: number;
  cash: number;
  facilities: PlayerFacilities | null | undefined;
  onTrain: (horseId: string, type: TrainingIntent["trainingType"]) => void;
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
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
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

interface BasicTrainingButtonProps {
  label: string;
  currentValue: number;
  nextValue: number;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
}

function BasicTrainingButton({
  label,
  currentValue,
  nextValue,
  disabled,
  disabledReason,
  onClick,
}: BasicTrainingButtonProps) {
  return (
    <DisabledTooltipWrapper reason={disabledReason}>
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn("w-full justify-between", disabled && "pointer-events-none")}
        variant="outline"
      >
        <span className="capitalize">{label} work</span>
        <span className="text-cream-muted">
          {currentValue} → {nextValue}
        </span>
      </Button>
    </DisabledTooltipWrapper>
  );
}

interface AdvancedWorkoutButtonProps {
  label: string;
  cost: number;
  isEnabled: boolean;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
}

function AdvancedWorkoutButton({
  label,
  cost,
  isEnabled,
  disabled,
  disabledReason,
  onClick,
}: AdvancedWorkoutButtonProps) {
  return (
    <DisabledTooltipWrapper reason={disabledReason}>
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn("w-full justify-between text-xs", disabled && "pointer-events-none")}
        variant="outline"
      >
        <div className="flex items-center gap-1">
          {!isEnabled ? <Lock className="h-3 w-3" /> : null}
          <span>{label}</span>
        </div>
        <span className="text-cream-muted">${cost}</span>
      </Button>
    </DisabledTooltipWrapper>
  );
}

interface RestButtonProps {
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
}

function RestButton({ disabled, disabledReason, onClick }: RestButtonProps) {
  return (
    <DisabledTooltipWrapper reason={disabledReason}>
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn("w-full", disabled && "pointer-events-none")}
        variant="secondary"
      >
        {REST_LABEL}
      </Button>
    </DisabledTooltipWrapper>
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

  const handleTrainingClick = useCallback(
    (type: TrainingIntent["trainingType"]) => {
      onTrain(horse.id, type);
    },
    [horse.id, onTrain],
  );

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
          nextValue: Math.min(horse.potential, Math.round(val) + 1),
          currentValue: Math.round(val),
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
          onClick: () => handleTrainingClick(workout.key as TrainingIntent["trainingType"]),
        };
      }),
    [availableTypes, horse, isPregnant, slotsLeft, cash, handleTrainingClick],
  );

  return (
    <div className="space-y-2">
      {basicTrainingButtons.map((btn) => (
        <BasicTrainingButton
          key={btn.key}
          label={btn.label}
          currentValue={btn.currentValue}
          nextValue={btn.nextValue}
          disabled={btn.disabled}
          disabledReason={btn.disabledReason}
          onClick={btn.onClick}
        />
      ))}

      <div className="pt-2 border-t border-gold-muted/30">
        <p className="text-xs text-cream-muted mb-2">{ADVANCED_WORKOUTS_LABEL}</p>
        <div className="grid grid-cols-2 gap-2">
          {advancedWorkoutButtons.map((btn) => (
            <AdvancedWorkoutButton
              key={btn.key}
              label={btn.label}
              cost={btn.cost}
              isEnabled={btn.isEnabled}
              disabled={btn.disabled}
              disabledReason={btn.disabledReason}
              onClick={btn.onClick}
            />
          ))}
        </div>
      </div>

      <RestButton
        disabled={isPregnant || slotsLeft <= 0 || horse.energy >= 100}
        disabledReason={
          isPregnant
            ? "Horse is pregnant"
            : slotsLeft <= 0
              ? "No training slots left today"
              : horse.energy >= 100
                ? "Horse is fully rested"
                : undefined
        }
        onClick={handleRest}
      />
    </div>
  );
}

export const TrainingPanel = memo(TrainingPanelComponent);
