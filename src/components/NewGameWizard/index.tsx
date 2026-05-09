import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dice5 } from "lucide-react";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/lib/formatting";
import type { NewGameOptions } from "@/game/state";
import { createRng, hashStr } from "@/game/rng";
import { generateSilk, SILK_PALETTE, SILK_PATTERNS } from "@/game/jockeyGen";
import { randomStableName, randomOwnerName } from "@/core/stable/stableGeneration";
import { BACKSTORIES, type Backstory } from "@/core/newGame/backstories";
import type { JockeySilk, JockeySilkPattern, BackstoryId } from "@/game/types";
import { SilkPreview } from "./SilkPreview";
import {
  loadWizardState,
  saveWizardState,
  clearWizardState,
  type WizardState,
} from "@/services/storageAdapter";

type Step = 0 | 1 | 2 | 3;

const TOTAL_HORSES = (b: Backstory) => b.horses.reduce((sum, h) => sum + h.count, 0);
const FACILITY_UPGRADE_COUNT = (b: Backstory) => Object.keys(b.facilityUpgrades).length;

function makeWizardRng(seed: string) {
  return createRng(hashStr(`wizard_${seed}_${Date.now()}_${Math.random()}`));
}

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
    const isHexColor = (v: unknown): v is string =>
      typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
    const silkValid =
      !!silk &&
      isHexColor(silk.primary) &&
      isHexColor(silk.secondary) &&
      isHexColor(silk.cap) &&
      (SILK_PATTERNS as readonly string[]).includes(silk.pattern);

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

// ---------------------------------------------------------------------------
// Step 0 — Stable identity
// ---------------------------------------------------------------------------

interface StepIdentityProps {
  stableName: string;
  setStableName: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
}
function StepIdentity({ stableName, setStableName, ownerName, setOwnerName }: StepIdentityProps) {
  return (
    <div className="space-y-6">
      <FieldWithRandom
        label="Stable name"
        tooltip="Appears on race programs, headlines, and your owner's silks."
        value={stableName}
        onChange={setStableName}
        onRandomize={() => setStableName(randomStableName(makeWizardRng("stable")))}
        maxLength={40}
        placeholder="Thunder Ridge Stables"
      />
      <FieldWithRandom
        label="Owner name"
        tooltip="The principal of record. Surfaces in the ledger and the press."
        value={ownerName}
        onChange={setOwnerName}
        onRandomize={() => setOwnerName(randomOwnerName(makeWizardRng("owner")))}
        maxLength={40}
        placeholder="Alex Whitfield"
      />
    </div>
  );
}

interface FieldWithRandomProps {
  label: string;
  tooltip: string;
  value: string;
  onChange: (v: string) => void;
  onRandomize: () => void;
  maxLength: number;
  placeholder?: string;
}
function FieldWithRandom({
  label,
  tooltip,
  value,
  onChange,
  onRandomize,
  maxLength,
  placeholder,
}: FieldWithRandomProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="text-sm font-medium text-cream cursor-help">{label}</label>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
        <span className="text-xs text-cream-muted tabular-nums">
          {value.length}/{maxLength}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRandomize}
              aria-label={`Roll a random ${label.toLowerCase()}`}
            >
              <Dice5 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Roll a random {label.toLowerCase()}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Silks
// ---------------------------------------------------------------------------

interface StepSilksProps {
  silk: JockeySilk;
  setSilk: (s: JockeySilk) => void;
}
function StepSilks({ silk, setSilk }: StepSilksProps) {
  const setColor = (key: "primary" | "secondary" | "cap", value: string) =>
    setSilk({ ...silk, [key]: value });

  return (
    <div className="grid gap-6 md:grid-cols-[160px_1fr]">
      <div className="flex flex-col items-center gap-3">
        <SilkPreview silk={silk} size={120} />
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSilk(generateSilk(makeWizardRng("silk")))}
              >
                <Dice5 className="h-4 w-4 mr-1" /> Randomize
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roll a fresh set of silks</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSilk({
                    pattern: "solid",
                    primary: "#FFFFFF",
                    secondary: "#FFFFFF",
                    cap: "#FFFFFF",
                  })
                }
              >
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to default white silks</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="space-y-4">
        <ColorSwatchPicker
          label="Primary"
          tooltip="Jacket main color. Also tints the silks shown next to your horses."
          value={silk.primary}
          onChange={(v) => setColor("primary", v)}
        />
        <ColorSwatchPicker
          label="Secondary"
          tooltip="Pattern accent — the color that draws the design on the jacket."
          value={silk.secondary}
          onChange={(v) => setColor("secondary", v)}
        />
        <ColorSwatchPicker
          label="Cap"
          tooltip="Cap color. Often used to distinguish horses owned by a partnership."
          value={silk.cap}
          onChange={(v) => setColor("cap", v)}
        />
        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="text-sm font-medium text-cream cursor-help">Pattern</label>
            </TooltipTrigger>
            <TooltipContent>How the colors are arranged on the silks.</TooltipContent>
          </Tooltip>
          <Select
            value={silk.pattern}
            onValueChange={(v) => setSilk({ ...silk, pattern: v as JockeySilkPattern })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SILK_PATTERNS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

interface ColorSwatchPickerProps {
  label: string;
  tooltip: string;
  value: string;
  onChange: (v: string) => void;
}
function ColorSwatchPicker({ label, tooltip, value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="text-sm font-medium text-cream cursor-help">{label}</label>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <div className="flex flex-wrap gap-2">
        {SILK_PALETTE.map((hex) => {
          const selected = hex.toLowerCase() === value.toLowerCase();
          return (
            <Tooltip key={hex}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(hex)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    selected
                      ? "border-gold scale-110 ring-2 ring-gold/40"
                      : "border-t700 hover:border-cream-muted"
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={`${label} ${hex}`}
                />
              </TooltipTrigger>
              <TooltipContent>{hex}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Backstory
// ---------------------------------------------------------------------------

interface StepBackstoryProps {
  backstoryId: BackstoryId | undefined;
  setBackstoryId: (id: BackstoryId) => void;
}
function StepBackstory({ backstoryId, setBackstoryId }: StepBackstoryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {BACKSTORIES.map((b) => {
        const selected = b.id === backstoryId;
        return (
          <Tooltip key={b.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setBackstoryId(b.id)}
                className={`text-left rounded-lg border-2 p-4 transition-all ${
                  selected
                    ? "border-gold bg-t800/60"
                    : "border-t700 bg-t900/40 hover:border-cream-muted"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg text-cream">
                    {b.label}
                  </h3>
                  <span className="text-xs uppercase tracking-wider text-cream-muted">
                    {b.difficulty.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-cream-muted">{b.blurb}</p>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-cream tabular-nums">
                  <dt className="text-cream-muted">Cash</dt>
                  <dd>{formatCurrency(b.startingCash)}</dd>
                  <dt className="text-cream-muted">Horses</dt>
                  <dd>{TOTAL_HORSES(b)}</dd>
                  <dt className="text-cream-muted">Upgraded facilities</dt>
                  <dd>{FACILITY_UPGRADE_COUNT(b)}</dd>
                  <dt className="text-cream-muted">Reputation</dt>
                  <dd>{b.reputationScore}</dd>
                </dl>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {b.difficulty.replace("_", " ")} • starts at reputation {b.reputationScore}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Review
// ---------------------------------------------------------------------------

interface StepReviewProps {
  stableName: string;
  ownerName: string;
  silk: JockeySilk;
  backstory: Backstory;
}
function StepReview({ stableName, ownerName, silk, backstory }: StepReviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[140px_1fr]">
      <SilkPreview silk={silk} size={120} />
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-[family-name:var(--font-display)] text-cream">
            {stableName}
          </h3>
          <p className="text-sm text-cream-muted">Owner: {ownerName}</p>
        </div>
        <div>
          <p className="text-sm text-cream font-medium">{backstory.label}</p>
          <p className="text-sm text-cream-muted">{backstory.blurb}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Starting cash</dt>
            </TooltipTrigger>
            <TooltipContent>
              Operating capital. You'll spend this on training, entries, and horses.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">{formatCurrency(backstory.startingCash)}</dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Starting horses</dt>
            </TooltipTrigger>
            <TooltipContent>
              Generated from your stable seed; pedigree and stats will be unique.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">
            {backstory.horses.map((h) => `${h.count}× ${h.tier}`).join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Facility upgrades</dt>
            </TooltipTrigger>
            <TooltipContent>
              You always start with all facilities at "basic"; these are upgrades on top.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">
            {Object.entries(backstory.facilityUpgrades).length === 0
              ? "—"
              : Object.entries(backstory.facilityUpgrades)
                  .map(([type, level]) => `${type.replace("_", " ")} (${level})`)
                  .join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Reputation</dt>
            </TooltipTrigger>
            <TooltipContent>
              0–1000 score. Affects scouting access and future race invitations.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">{backstory.reputationScore}</dd>
        </dl>
      </div>
    </div>
  );
}
