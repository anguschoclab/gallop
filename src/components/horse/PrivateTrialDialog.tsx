import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePrivateTrial } from "@/hooks/race/usePrivateTrial";
import { PrivateTrialForm } from "./PrivateTrialForm";
import { PrivateTrialResults } from "./PrivateTrialResults";
import type { Horse } from "@/game/types";

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={horse.energy < 20 || cash < 250}
          className="w-full bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-widest text-xs h-10 rounded-none shadow-lg mt-2"
        >
          Run Private Trial ($250 / -20 Energy)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-950 border border-gold-muted/40 rounded-none text-cream shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Private Trial Simulator
          </DialogTitle>
          <DialogDescription className="text-xs text-cream-muted uppercase font-mono tracking-wider">
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
