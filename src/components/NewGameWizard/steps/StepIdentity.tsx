import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dice5 } from "lucide-react";
import { randomStableName, randomOwnerName } from "@/core/stable/stableGeneration";
import { makeWizardRng } from "./helpers";

interface StepIdentityProps {
  stableName: string;
  setStableName: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
}

export function StepIdentity({ stableName, setStableName, ownerName, setOwnerName }: StepIdentityProps) {
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
