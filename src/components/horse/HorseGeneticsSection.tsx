import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dna } from "lucide-react";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { deriveHorseGenetics } from "@/core/horse/genetics-readout";
import type { Horse } from "@/core/horse/types";
import { cn } from "@/lib/cn";

const RISK_STYLES: Record<string, string> = {
  low: "border-white/10 text-cream/50",
  moderate: "border-amber-500/40 text-amber-300",
  elevated: "border-red-500/50 text-red-300",
};

function StatLine({ label, value, term }: { label: string; value: string; term?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-cream/60">
        {term ? <JargonTooltip term={term}>{label}</JargonTooltip> : label}
      </span>
      <span className="font-mono tabular-nums text-cream">{value}</span>
    </div>
  );
}

export function HorseGeneticsSection({ horse }: { horse: Horse }) {
  const g = deriveHorseGenetics(horse);
  const isMare = horse.gender === "mare" || horse.gender === "filly";

  return (
    <section id="genetics" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Dna className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">Genetics</h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cream/40">
            Inherited Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Pedigree-derived */}
          <div className="space-y-2">
            <StatLine
              label="Dosage Index"
              term="Dosage Index"
              value={g.dosage.index === Infinity ? "∞" : g.dosage.index.toFixed(2)}
            />
            <p className="text-xs text-cream/40 italic">{g.dosage.interpretation}</p>
            <StatLine label="Inbreeding" term="Inbreeding" value={g.inbreeding.description} />
            {g.inbreeding.warning && (
              <p className="text-xs text-red-300/80">{g.inbreeding.warning}</p>
            )}
            <StatLine
              label="Bruce Lowe Family"
              term="Bruce Lowe Family"
              value={g.bruceLowe.family ? `F${g.bruceLowe.family} · ${g.bruceLowe.role}` : "—"}
            />
          </div>

          {/* Traits */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <StatLine label="Temperament" value={g.traits.temperament} />
            <StatLine label="Constitution" value={g.traits.constitution} />
            <StatLine
              label="Trainability"
              term="Trainability"
              value={`${g.traits.trainability.toFixed(2)}×`}
            />
            <StatLine
              label="Heart Score"
              term="Heart Score"
              value={g.traits.heartScore.toFixed(2)}
            />
            <StatLine label="Peak Age" term="Peak Age" value={`${g.traits.peakAge} yo`} />
            {isMare && (
              <StatLine
                label="Foaling Ease"
                term="Foaling Ease"
                value={g.traits.foalingEase.toFixed(2)}
              />
            )}
          </div>

          {/* Going / aptitude */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <StatLine
              label="Mud Aptitude"
              term="Mud Aptitude"
              value={g.aptitude.mudAptitude.toFixed(2)}
            />
            <StatLine
              label="Weather Preference"
              term="Weather Preference"
              value={g.aptitude.weatherPreference}
            />
            <StatLine label="Stride" value={g.aptitude.strideType} />
            <StatLine label="Track Hand" value={g.aptitude.trackPreference} />
          </div>

          {/* Health risks */}
          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-widest mb-2">
              Health Risk
            </div>
            <div className="flex flex-wrap gap-2">
              {g.health.map((h) => (
                <Badge
                  key={h.key}
                  variant="outline"
                  className={cn("font-mono text-[10px] uppercase", RISK_STYLES[h.risk])}
                >
                  {h.label}: {h.risk}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
