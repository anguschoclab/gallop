import { useId } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JockeyArchetype, JockeySilkPattern } from "@/game/types";
import { FilterSelect } from "./FilterSelect";
import { Search, Filter } from "lucide-react";
import { JOCKEY_TRAIT_OPTIONS } from "@/core/common/traitLabels";
import type { JockeyTrait } from "@/core/jockey/types";

interface JockeyFilterPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  archetypeFilter: JockeyArchetype | "all";
  onArchetypeChange: (value: JockeyArchetype | "all") => void;
  patternFilter: JockeySilkPattern | "all";
  onPatternChange: (value: JockeySilkPattern | "all") => void;
  colorFilter: string;
  onColorChange: (value: string) => void;
  traitFilter: JockeyTrait | "all";
  onTraitChange: (value: JockeyTrait | "all") => void;
  onReset: () => void;
}

const archetypeOptions = [
  { value: "all", label: "All Styles" },
  { value: "front_runner", label: "FRONT RUNNER" },
  { value: "closer", label: "CLOSER" },
  { value: "clinical", label: "CLINICAL" },
  { value: "finisher", label: "FINISHER" },
  { value: "versatile", label: "VERSATILE" },
];

const patternOptions = [
  { value: "all", label: "All Patterns" },
  { value: "solid", label: "SOLID" },
  { value: "stripes", label: "STRIPES" },
  { value: "halves", label: "HALVES" },
  { value: "quarters", label: "QUARTERS" },
  { value: "chevron", label: "CHEVRON" },
  { value: "diamond", label: "DIAMOND" },
  { value: "star", label: "STAR" },
  { value: "sash", label: "SASH" },
  { value: "hoops", label: "HOOPS" },
];

const colorOptions = [
  { value: "all", label: "All Colours" },
  { value: "#ff0000", label: "Red" },
  { value: "#0000ff", label: "Blue" },
  { value: "#00ff00", label: "Green" },
  { value: "#ffff00", label: "Yellow" },
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#ff8000", label: "Orange" },
  { value: "#800080", label: "Purple" },
];

export function JockeyFilterPanel({
  search,
  onSearchChange,
  archetypeFilter,
  onArchetypeChange,
  patternFilter,
  onPatternChange,
  colorFilter,
  onColorChange,
  traitFilter,
  onTraitChange,
  onReset,
}: JockeyFilterPanelProps) {
  const searchId = useId();
  return (
    <aside className="lg:col-span-3 space-y-8 lg:sticky lg:top-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Filter className="h-3.5 w-3.5 text-blue-400/60" />
          <h2 className="text-[10px] font-black uppercase tracking-wide text-cream/40">Filters</h2>
        </div>
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-blue-400/40">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor={searchId}
                className="text-[9px] uppercase font-black text-blue-400/40 tracking-wide px-1"
              >
                Name
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                <Input
                  id={searchId}
                  placeholder="Jockey name or trait..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-9 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-blue-500/30"
                />
              </div>
            </div>

            <FilterSelect
              label="Riding Style"
              value={archetypeFilter}
              options={archetypeOptions}
              onChange={(v) => onArchetypeChange(v as JockeyArchetype | "all")}
            />

            <FilterSelect
              label="Silk Pattern"
              value={patternFilter}
              options={patternOptions}
              onChange={(v) => onPatternChange(v as JockeySilkPattern | "all")}
            />

            <FilterSelect
              label="Silk Colour"
              value={colorFilter}
              options={colorOptions}
              onChange={onColorChange}
            />

            <FilterSelect
              label="Trait"
              value={traitFilter}
              options={JOCKEY_TRAIT_OPTIONS}
              onChange={(v) => onTraitChange(v as JockeyTrait | "all")}
            />

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-[9px] font-black uppercase tracking-wide text-cream/10 hover:text-cream/30 border border-dashed border-white/5 mt-2"
              onClick={onReset}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="p-4 bg-black/40 border border-white/5 text-center">
        <div className="text-[8px] font-black uppercase text-blue-400/40 tracking-wide mb-2 px-1">
          Rider Standards
        </div>
        <p className="text-[8px] font-mono text-cream/20 uppercase leading-relaxed italic">
          All retained riders must maintain active health certification and gear standards.
        </p>
      </div>
    </aside>
  );
}
