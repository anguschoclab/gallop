import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import type { NewGameOptions } from "@/game/store/state";
import { generateSilk } from "@/core/jockey/generator";
import { SILK_PATTERNS } from "@/data/jockeys";
import { randomStableName, randomOwnerName } from "@/core/stable/stableGeneration";
import { BACKSTORIES } from "@/core/common/backstories";
import type { JockeySilk, BackstoryId } from "@/game/types";
import {
  loadWizardState,
  saveWizardState,
  clearWizardState,
  type WizardState,
} from "@/services/storageAdapter";
import { makeWizardRng } from "@/components/NewGameWizard/steps/helpers";

export type Step = 0 | 1 | 2 | 3;

export function useNewGameWizard() {
  const navigate = useNavigate();
  const startNewGame = useGame((s) => s.startNewGame);

  const [step, setStep] = useState<Step>(0);
  const [stableName, setStableName] = useState(() => randomStableName(makeWizardRng("stable")));
  const [ownerName, setOwnerName] = useState(() => randomOwnerName(makeWizardRng("owner")));
  const [silk, setSilk] = useState<JockeySilk>(() => generateSilk(makeWizardRng("silk")));
  const [backstoryId, setBackstoryId] = useState<BackstoryId | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

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
        clearWizardState();
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const state: WizardState = {
        step,
        stableName,
        ownerName,
        silk,
        backstoryId: backstoryId || "",
      };
      saveWizardState(state);
    }, 300);
    return () => clearTimeout(timeoutId);
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

  const handleStart = useCallback(async () => {
    if (!selectedBackstory) return;
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
    navigate({ to: "/", replace: true });
  }, [selectedBackstory, silkValid, stableName, ownerName, silk, startNewGame, navigate]);

  return {
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
  };
}
