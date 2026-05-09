import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGame } from "@/game/store";
import type { NewGameOptions } from "@/game/state";
import { generateSilk } from "@/game/jockeyGen";
import { SILK_PATTERNS } from "@/game/jockeyData";
import { randomStableName, randomOwnerName } from "@/core/stable/stableGeneration";
import { BACKSTORIES } from "@/core/newGame/backstories";
import type { JockeySilk, BackstoryId } from "@/game/types";
import {
  loadWizardState,
  saveWizardState,
  clearWizardState,
  type WizardState,
} from "@/services/storageAdapter";
import { StepIdentity } from "./steps/StepIdentity";
import { StepSilks } from "./steps/StepSilks";
import { StepBackstory } from "./steps/StepBackstory";
import { StepReview } from "./steps/StepReview";
import { makeWizardRng } from "./steps/helpers";

type Step = 0 | 1 | 2 | 3;

export function NewGameWizard() {
  const navigate = useNavigate();
  const startNewGame = useGame((s) => s.startNewGame);

  const [step, setStep] = useState<Step>(0);
  const [stableName, setStableName] = useState(() => randomStableName(makeWizardRng("stable")));
  const [ownerName, setOwnerName] = useState(() => randomOwnerName(makeWizardRng("owner")));
  const [silk, setSilk] = useState<JockeySilk>(() => generateSilk(makeWizardRng("silk")));
  const [backstoryId, setBackstoryId] = useState<BackstoryId | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Load saved wizard state on mount
  useEffect(() => {
    const saved = loadWizardState();
    if (saved) {
      try {
        setStep(saved.step as Step);
        setStableName(saved.stableName);
        setOwnerName(saved.ownerName);
        setSilk(saved.silk as JockeySilk);
        setBackstoryId(saved.backstoryId as BackstoryId);
      } catch (error) {
        console.error("Failed to restore wizard state:", error);
        // Clear corrupted state
        clearWizardState();
      }
    }
  }, []);

  // Save wizard state on any change
  useEffect(() => {
    const state: WizardState = {
      step,
      stableName,
      ownerName,
      silk,
      backstoryId: backstoryId || "",
    };
    saveWizardState(state);
  }, [step, stableName, ownerName, silk, backstoryId]);

  const selectedBackstory = useMemo(
    () => BACKSTORIES.find((b) => b.id === backstoryId),
    [backstoryId],
  );

  const stableNameValid = stableName.trim().length > 0 && stableName.length <= 40;
  const ownerNameValid = ownerName.trim().length > 0 && ownerName.length <= 40;

  const isHexColor = (v: unknown): v is string =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  const silkValid =
    !!silk &&
    isHexColor(silk.primary) &&
    isHexColor(silk.secondary) &&
    isHexColor(silk.cap) &&
    (SILK_PATTERNS as readonly string[]).includes(silk.pattern);

  const canProceed =
    (step === 0 && stableNameValid && ownerNameValid) ||
    (step === 1 && silkValid) ||
    (step === 2 && !!selectedBackstory) ||
    (step === 3 && silkValid && !!selectedBackstory && stableNameValid && ownerNameValid);

  const handleStart = async () => {
    if (!selectedBackstory) return;

    // Final validation check - prevent game start with invalid silks
    if (!silkValid) {
      alert("Invalid silks data. Please check your silks configuration before starting.");
      return;
    }

    setSubmitting(true);
    const options: NewGameOptions = {
      profile: {
        stableName: stableName.trim(),
        ownerName: ownerName.trim(),
        silk,
        backstoryId: selectedBackstory.id,
        founded: 1,
      },
      backstory: selectedBackstory,
    };
    await startNewGame(options);
    clearWizardState();
    navigate({ to: "/" });
  };

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
