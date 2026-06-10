import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNewGameWizard, type Step } from "@/hooks/useNewGameWizard";
import { StepIdentity } from "./steps/StepIdentity";
import { StepSilks } from "./steps/StepSilks";
import { StepBackstory } from "./steps/StepBackstory";
import { StepReview } from "./steps/StepReview";

export function NewGameWizard() {
  const {
    step,
    setStep,
    stableName,
    setStableName,
    ownerName,
    setOwnerName,
    silk,
    setSilk,
    backstoryId,
    setBackstoryId,
    submitting,
    selectedBackstory,
    canProceed,
    handleStart,
    silkValid,
  } = useNewGameWizard();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <header className="mb-8 text-center">
            <h1 className="text-5xl font-bold text-cream font-[family-name:var(--font-display)]">
              Gallop
            </h1>
            <p className="mt-2 text-cream-muted font-[family-name:var(--font-body)]">
              Found your stable
            </p>
            <StepIndicator step={step} />
          </header>

          <Card className="bg-t900/60 border-t700">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-cream">
                {STEP_TITLES[step]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 0 && (
                <StepIdentity
                  stableName={stableName}
                  setStableName={setStableName}
                  ownerName={ownerName}
                  setOwnerName={setOwnerName}
                />
              )}
              {step === 1 && <StepSilks silk={silk} setSilk={setSilk} />}
              {step === 2 && (
                <StepBackstory backstoryId={backstoryId} setBackstoryId={setBackstoryId} />
              )}
              {step === 3 && selectedBackstory && (
                <StepReview
                  stableName={stableName}
                  ownerName={ownerName}
                  silk={silk}
                  backstory={selectedBackstory}
                />
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0 || submitting}
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button
                disabled={!canProceed || submitting}
                onClick={() => setStep((s) => Math.min(3, s + 1) as Step)}
              >
                Continue
              </Button>
            ) : (
              <Button
                disabled={!selectedBackstory || !silkValid || submitting}
                onClick={handleStart}
              >
                {submitting ? "Starting…" : "Begin"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

const STEP_TITLES = ["Stable identity", "Silks", "Backstory", "Review & begin"];

function StepIndicator({ step }: { step: Step }) {
  return (
    <ol className="mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-cream-muted">
      {STEP_TITLES.map((title, i) => (
        <li
          key={title}
          className={i === step ? "text-gold" : i < step ? "text-cream" : "text-cream-muted/50"}
        >
          {i + 1}. {title}
          {i < STEP_TITLES.length - 1 && <span className="ml-2 text-cream-muted/30">›</span>}
        </li>
      ))}
    </ol>
  );
}
