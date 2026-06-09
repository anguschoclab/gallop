import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JockeyArchetype, JockeySilkPattern } from "@/game/types";
import { Search, Filter } from "lucide-react";

interface JockeyFilterPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  archetypeFilter: JockeyArchetype | "all";
  onArchetypeChange: (value: JockeyArchetype | "all") => void;
  patternFilter: JockeySilkPattern | "all";
  onPatternChange: (value: JockeySilkPattern | "all") => void;
  colorFilter: string;
  onColorChange: (value: string) => void;
  onReset: () => void;
}

const archetypes: JockeyArchetype[] = [
  "front_runner",
  "closer",
  "clinical",
  "finisher",
  "versatile",
];

const patterns: JockeySilkPattern[] = [
  "solid",
  "stripes",
  "halves",
  "quarters",
  "chevron",
  "diamond",
  "star",
  "sash",
  "hoops",
];

const commonColors = [
  { value: "all", label: "All Colours", hex: "#ffffff" },
  { value: "#ff0000", label: "Red", hex: "#ff0000" },
  { value: "#0000ff", label: "Blue", hex: "#0000ff" },
  { value: "#00ff00", label: "Green", hex: "#00ff00" },
  { value: "#ffff00", label: "Yellow", hex: "#ffff00" },
  { value: "#ffffff", label: "White", hex: "#ffffff" },
  { value: "#000000", label: "Black", hex: "#000000" },
  { value: "#ff8000", label: "Orange", hex: "#ff8000" },
  { value: "#800080", label: "Purple", hex: "#800080" },
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
  onReset,
}: JockeyFilterPanelProps) {
  return (
    <aside className="lg:col-span-3 space-y-8 lg:sticky lg:top-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Filter className="h-3.5 w-3.5 text-blue-400/60" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
            Filters
          </h2>
        </div>
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-blue-400/40">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                Name
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                <Input
                  placeholder="Jockey name..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-9 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                Riding Style
              </label>
              <select
                className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                value={archetypeFilter}
                onChange={(e) => onArchetypeChange(e.target.value as JockeyArchetype | "all")}
              >
                <option value="all">All Styles</option>
                {archetypes.map((a) => (
                  <option key={a} value={a}>
                    {a.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                Silk Pattern
              </label>
              <select
                className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                value={patternFilter}
                onChange={(e) => onPatternChange(e.target.value as JockeySilkPattern | "all")}
              >
                <option value="all">All Patterns</option>
                {patterns.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                Silk Colour
              </label>
              <select
                className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                value={colorFilter}
                onChange={(e) => onColorChange(e.target.value)}
              >
                {commonColors.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-cream/10 hover:text-cream/30 border border-dashed border-white/5 mt-2"
              onClick={onReset}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="p-4 bg-black/40 border border-white/5 text-center">
        <div className="text-[8px] font-black uppercase text-blue-400/40 tracking-[0.2em] mb-2 px-1">
          Rider Standards
        </div>
        <p className="text-[8px] font-mono text-cream/20 uppercase leading-relaxed italic">
          All retained riders must maintain active health certification and gear standards.
        </p>
      </div>
    </aside>
  );
}
