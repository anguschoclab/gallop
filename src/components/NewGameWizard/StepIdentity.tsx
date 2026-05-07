import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FILLER_PREFIXES, FILLER_SUFFIXES } from "@/core/stable/stableGeneration";
import { OWNER_NAMES } from "@/core/newGame/backstories";
import { createRng, hashStr } from "@/game/rng";

interface StepIdentityProps {
  stableName: string;
  ownerName: string;
  onChange: (stableName: string, ownerName: string) => void;
  onNext: () => void;
}

export function StepIdentity({ stableName, ownerName, onChange, onNext }: StepIdentityProps) {
  const [localStableName, setLocalStableName] = useState(stableName);
  const [localOwnerName, setLocalOwnerName] = useState(ownerName);

  const handleRandomStableName = () => {
    const rng = createRng(hashStr(Date.now().toString()));
    const prefix = rng.pick(FILLER_PREFIXES);
    const suffix = rng.pick(FILLER_SUFFIXES);
    const newName = `${prefix} ${suffix}`;
    setLocalStableName(newName);
    onChange(newName, localOwnerName);
  };

  const handleRandomOwnerName = () => {
    const rng = createRng(hashStr(Date.now().toString()));
    const newName = rng.pick<string>(OWNER_NAMES);
    setLocalOwnerName(newName);
    onChange(localStableName, newName);
  };

  const handleNext = () => {
    if (localStableName.trim() && localOwnerName.trim()) {
      onChange(localStableName.trim(), localOwnerName.trim());
      onNext();
    }
  };

  const isValid = localStableName.trim().length > 0 && localOwnerName.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-display)] mb-2">
          Stable Identity
        </h2>
        <p className="text-cream-muted">Give your stable a name and introduce yourself.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="stableName" className="text-sm font-medium text-cream">
            Stable Name
          </label>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    id="stableName"
                    value={localStableName}
                    onChange={(e) => setLocalStableName(e.target.value)}
                    maxLength={40}
                    placeholder="e.g., Thunder Ridge Stables"
                    className="flex-1"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stable name appears on race programs and headlines.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRandomStableName}
                    aria-label="Roll a random stable name"
                  >
                    🎲
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Roll a random stable name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="ownerName" className="text-sm font-medium text-cream">
            Owner Name
          </label>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    id="ownerName"
                    value={localOwnerName}
                    onChange={(e) => setLocalOwnerName(e.target.value)}
                    maxLength={40}
                    placeholder="e.g., A. Mauricia"
                    className="flex-1"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your name as the stable owner.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRandomOwnerName}
                    aria-label="Roll a random owner name"
                  >
                    🎲
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Roll a random owner name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!isValid}>
          Next
        </Button>
      </div>
    </div>
  );
}
