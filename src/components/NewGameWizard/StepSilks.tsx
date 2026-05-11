import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SILK_PALETTE, SILK_PATTERNS, generateSilk } from "@/game/jockeyGen";
import { createRng, hashStr } from "@/game/rng";
import { SilkPreview } from "./SilkPreview";
import type { JockeySilk } from "@/game/types";

interface StepSilksProps {
  silk: JockeySilk;
  onChange: (silk: JockeySilk) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSilks({ silk, onChange, onNext, onBack }: StepSilksProps) {
  const [localSilk, setLocalSilk] = useState(silk);

  const handleRandomSilk = () => {
    const rng = createRng(hashStr(Date.now().toString()));
    const newSilk = generateSilk(rng);
    setLocalSilk(newSilk);
    onChange(newSilk);
  };

  const handleNext = () => {
    onChange(localSilk);
    onNext();
  };

  const handleColorChange = (field: "primary" | "secondary" | "cap", color: string) => {
    const newSilk = { ...localSilk, [field]: color };
    setLocalSilk(newSilk);
    onChange(newSilk);
  };

  const handlePatternChange = (pattern: JockeySilk["pattern"]) => {
    const newSilk = { ...localSilk, pattern };
    setLocalSilk(newSilk);
    onChange(newSilk);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-display)] mb-2">
          Racing Silks
        </h2>
        <p className="text-cream-muted">Choose your stable's racing colors and pattern.</p>
      </div>

      <div className="flex gap-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-cream">Primary Color</label>
            <div className="flex flex-wrap gap-2">
              {SILK_PALETTE.map((color) => (
                <TooltipProvider key={color}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleColorChange("primary", color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          localSilk.primary === color
                            ? "border-gold scale-110"
                            : "border-white/20 hover:border-white/40"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{color}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-cream">Secondary Color</label>
            <div className="flex flex-wrap gap-2">
              {SILK_PALETTE.map((color) => (
                <TooltipProvider key={color}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleColorChange("secondary", color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          localSilk.secondary === color
                            ? "border-gold scale-110"
                            : "border-white/20 hover:border-white/40"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{color}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-cream">Cap Color</label>
            <div className="flex flex-wrap gap-2">
              {SILK_PALETTE.map((color) => (
                <TooltipProvider key={color}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleColorChange("cap", color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          localSilk.cap === color
                            ? "border-gold scale-110"
                            : "border-white/20 hover:border-white/40"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{color}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-cream">Pattern</label>
            <div className="flex flex-wrap gap-2">
              {SILK_PATTERNS.map((pattern) => (
                <TooltipProvider key={pattern}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handlePatternChange(pattern)}
                        className={`px-3 py-2 rounded-md border-2 transition-all text-sm ${
                          localSilk.pattern === pattern
                            ? "border-gold bg-gold/20"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {pattern}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="capitalize">{pattern} pattern</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRandomSilk}
                  className="w-full"
                >
                  🎲 Random Silks
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate random racing silks</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-t800 rounded-xl border border-gold-muted">
          <label className="text-sm font-medium text-cream mb-4">Preview</label>
          <SilkPreview silk={localSilk} size={160} />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
}
