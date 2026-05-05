import { useState } from "react";
import { useGame } from "@/game/store";
import { StepIdentity } from "./StepIdentity";
import { StepSilks } from "./StepSilks";
import { StepBackstory } from "./StepBackstory";
import { StepReview } from "./StepReview";
import { generateSilk } from "@/game/jockeyGen";
import { createRng, hashStr } from "@/game/rng";
import type { PlayerProfile, BackstoryId, JockeySilk } from "@/game/types";
import type { Backstory } from "@/core/newGame/backstories";

interface NewGameWizardProps {
  onComplete: () => void;
}

export function NewGameWizard({ onComplete }: NewGameWizardProps) {
  const startNewGame = useGame((state) => state.startNewGame);

  const [step, setStep] = useState(1);
  const [stableName, setStableName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [silk, setSilk] = useState<JockeySilk>(() => {
    const rng = createRng(hashStr(Date.now().toString()));
    return generateSilk(rng);
  });
  const [backstoryId, setBackstoryId] = useState<BackstoryId>("claiming_trainer");

  const handleIdentityChange = (newStableName: string, newOwnerName: string) => {
    setStableName(newStableName);
    setOwnerName(newOwnerName);
  };

  const handleSilkChange = (newSilk: JockeySilk) => {
    setSilk(newSilk);
  };

  const handleBackstoryChange = (newBackstoryId: BackstoryId) => {
    setBackstoryId(newBackstoryId);
  };

  const handleBegin = async () => {
    const profile: PlayerProfile = {
      stableName,
      ownerName,
      silk,
      backstoryId,
      founded: 1,
      country: "USA",
    };

    // Import backstory dynamically to avoid circular dependency
    const { getBackstory } = await import("@/core/newGame/backstories");
    const backstory = getBackstory(backstoryId);

    await startNewGame({ profile, backstory });
    onComplete();
  };

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-t900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center ${
                  s < 4 ? "flex-1" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s
                      ? "bg-gold text-t950"
                      : "bg-t800 text-cream-muted border border-gold-muted"
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? "bg-gold" : "bg-t800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-cream-muted">
            <span>Identity</span>
            <span>Silks</span>
            <span>Backstory</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-t800 rounded-xl border border-gold-muted p-6">
          {step === 1 && (
            <StepIdentity
              stableName={stableName}
              ownerName={ownerName}
              onChange={handleIdentityChange}
              onNext={handleNext}
            />
          )}
          {step === 2 && (
            <StepSilks
              silk={silk}
              onChange={handleSilkChange}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <StepBackstory
              backstoryId={backstoryId}
              onChange={handleBackstoryChange}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 4 && (
            <StepReview
              profile={{ stableName, ownerName, silk, backstoryId, founded: 1 }}
              backstoryId={backstoryId}
              onBegin={handleBegin}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
