import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dice5 } from "lucide-react";
import { generateSilk } from "@/game/jockeyGen";
import { SILK_PALETTE, SILK_PATTERNS } from "@/game/jockeyData";
import type { JockeySilk, JockeySilkPattern } from "@/game/types";
import { SilkPreview } from "../SilkPreview";
import { makeWizardRng } from "./helpers";

interface StepSilksProps {
  silk: JockeySilk;
  setSilk: (s: JockeySilk) => void;
}

export function StepSilks({ silk, setSilk }: StepSilksProps) {
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
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                selected
                  ? "border-gold scale-110 ring-2 ring-gold/40"
                  : "border-t700 hover:border-cream-muted"
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`${label} ${hex}`}
              title={hex}
            />
          );
        })}
      </div>
    </div>
  );
}
