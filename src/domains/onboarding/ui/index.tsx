import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";
import { useNewGameWizard, type Step } from "@/domains/onboarding/application/useNewGameWizard";
import { StepIdentity } from "@/domains/onboarding/ui/steps/StepIdentity";
import { StepSilks } from "@/domains/onboarding/ui/steps/StepSilks";
import { StepBackstory } from "@/domains/onboarding/ui/steps/StepBackstory";
import { StepWorldSize } from "@/domains/onboarding/ui/steps/StepWorldSize";
import { StepReview } from "@/domains/onboarding/ui/steps/StepReview";

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
    worldSize,
    setWorldSize,
    submitting,
    initProgress,
    selectedBackstory,
    canProceed,
    handleStart,
    silkValid,
  } = useNewGameWizard();

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <header className="mb-8 text-center">
            <h1 className="text-5xl font-bold text-foreground font-[family-name:var(--font-display)]">
              Gallop
            </h1>
            <p className="mt-2 text-muted-foreground font-[family-name:var(--font-body)]">
              Found your stable
            </p>
            <StepIndicator step={step} />
          </header>

          <Card className="bg-surface/60 border-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-foreground">
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
              {step === 3 && <StepWorldSize worldSize={worldSize} setWorldSize={setWorldSize} />}
              {step === 4 && selectedBackstory && (
                <StepReview
                  stableName={stableName}
                  ownerName={ownerName}
                  silk={silk}
                  backstory={selectedBackstory}
                  worldSize={worldSize}
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
            {step < 4 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={canProceed ? -1 : 0} className="inline-flex">
                    <Button
                      disabled={!canProceed || submitting}
                      onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
                    >
                      Continue
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canProceed && <TooltipContent>Complete this step to continue</TooltipContent>}
              </Tooltip>
            ) : (
              <Button
                disabled={!selectedBackstory || !silkValid || submitting}
                onClick={handleStart}
              >
                {submitting ? "Starting…" : "Begin"}
              </Button>
            )}
          </div>
          {submitting && initProgress && (
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.round((initProgress.stage / initProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {initProgress.name} ({initProgress.stage}/{initProgress.total})
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

const STEP_TITLES = ["Stable identity", "Silks", "Backstory", "World size", "Review & begin"];

function StepIndicator({ step }: { step: Step }) {
  return (
    <ol className="mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {STEP_TITLES.map((title, i) => (
        <li
          key={title}
          className={
            i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground/50"
          }
        >
          {i + 1}. {title}
          {i < STEP_TITLES.length - 1 && <span className="ml-2 text-muted-foreground/30">›</span>}
        </li>
      ))}
    </ol>
  );
}
