import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/shared/ui/dialog";
import { DisabledTooltipWrapper } from "@/shared/ui/DisabledTooltipWrapper";
import { cn } from "@/shared/lib/cn";
import { usePrivateTrial } from "@/domains/race/application/hooks/usePrivateTrial";
import { PrivateTrialForm } from "@/domains/horse/ui/PrivateTrialForm";
import { PrivateTrialResults } from "@/domains/horse/ui/PrivateTrialResults";
import type { Horse } from "@/platform/game/types";

interface PrivateTrialDialogProps {
  horse: Horse;
  horses: Horse[];
  cash: number;
}

export function PrivateTrialDialog({ horse, horses, cash }: PrivateTrialDialogProps) {
  const {
    isOpen,
    setIsOpen,
    distance,
    setDistance,
    surface,
    setSurface,
    opponentId,
    setOpponentId,
    loading,
    error,
    trialResult,
    eligibleOpponents,
    opponentName,
    chartData,
    runnerStats,
    feedback,
    handleStartTrial,
    handleReset,
  } = usePrivateTrial(horse, horses, cash);

  const notEnoughEnergy = horse.energy < 20;
  const notEnoughCash = cash < 250;
  const isDisabled = notEnoughEnergy || notEnoughCash;
  let disabledReason = "";
  if (notEnoughCash && notEnoughEnergy) {
    disabledReason = "Not enough cash ($250) and energy (20)";
  } else if (notEnoughCash) {
    disabledReason = "Not enough cash ($250 required)";
  } else if (notEnoughEnergy) {
    disabledReason = "Not enough energy (20 required)";
  }

  const triggerButton = (
    <Button
      disabled={isDisabled}
      className={cn(
        "w-full bg-primary hover:bg-accent-bright text-slate-950 font-black uppercase tracking-wide text-xs h-10 rounded-none shadow-lg mt-2",
        isDisabled && "pointer-events-none",
      )}
    >
      Run Private Trial ($250 / -20 Energy)
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {isDisabled ? (
        <DisabledTooltipWrapper reason={disabledReason} wrapperClassName="w-full">
          {triggerButton}
        </DisabledTooltipWrapper>
      ) : (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-slate-950 border border-border/40 rounded-none text-foreground shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
            Private Trial Simulator
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
            Test {horse.name}&apos;s performance under controlled conditions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 font-mono uppercase tracking-wider mb-4">
            Error: {error}
          </div>
        )}

        {!trialResult ? (
          <PrivateTrialForm
            distance={distance}
            setDistance={setDistance}
            surface={surface}
            setSurface={setSurface}
            opponentId={opponentId}
            setOpponentId={setOpponentId}
            eligibleOpponents={eligibleOpponents}
            horse={horse}
            cash={cash}
            loading={loading}
            onStart={handleStartTrial}
          />
        ) : (
          <PrivateTrialResults
            runnerStats={runnerStats}
            chartData={chartData}
            feedback={feedback}
            horse={horse}
            opponentName={opponentName}
            onReset={handleReset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
