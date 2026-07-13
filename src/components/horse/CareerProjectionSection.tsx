import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { CareerValuationBreakdown } from "@/components/horse/CareerValuationBreakdown";
import { horseCareerValuation } from "@/core/horse/pricing";
import { calculateOverallRating, getCareerStats } from "@/core/horse/stats";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import { formatCurrency } from "@/core/common/formatting";
import type { Horse } from "@/game/types";

interface CareerProjectionSectionProps {
  horse: Horse;
  horses: Record<string, Horse>;
}

export function CareerProjectionSection({ horse, horses }: CareerProjectionSectionProps) {
  const valuation = useMemo(
    () => horseCareerValuation(horse, Object.values(horses)),
    [horse, horses],
  );

  const overall = calculateOverallRating(horse);
  const careerStats = getCareerStats(horse);
  const pedMul = pedigreeMultiplier(horse, { horses });
  const isGelding = horse.gender === "gelding" || horse.gelded;
  const g1Production = horse.stud?.lifetimeG1Foals ?? horse.blueHenStatus?.group1WinnersProduced ?? 0;
  const stakesProduction = horse.stud?.lifetimeStakesFoals ?? horse.blueHenStatus?.stakesWinnersProduced ?? 0;

  const factors: { label: string; value: string }[] = [
    { label: "Overall Rating", value: String(overall) },
    { label: "Stakes Wins", value: String(careerStats.stakesWins) },
    { label: "G1 Production", value: String(g1Production) },
    { label: "Stakes Production", value: String(stakesProduction) },
    { label: "Foaling Ease", value: (horse.foalingEase ?? 1.0).toFixed(2) },
    { label: "Fertility", value: (horse.fertility ?? 0.9).toFixed(2) },
    { label: "Pedigree Multiplier", value: `×${pedMul.toFixed(2)}` },
    { label: "Potential", value: String(horse.potential ?? 50) },
  ];

  return (
    <section id="projection" className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Career Projection
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardContent className="p-6 space-y-6">
          {/* Valuation breakdown */}
          <CareerValuationBreakdown valuation={valuation} />

          {/* Input factors */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-widest">
              Key Input Factors
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {factors.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono font-bold text-cream/80 tabular-nums">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanatory text */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-widest">
              How the Model Works
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-cream/70 font-semibold">Pre-career</span> projects the
              horse's value as a yearling, before any race record — driven by pedigree multiplier,
              potential, and a slice of breeding upside.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-cream/70 font-semibold">Current</span> blends racing form
              with breeding optionality. The weight shifts from racing-heavy (young, active) to
              breeding-heavy (older, retired).
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-cream/70 font-semibold">Post-career</span> estimates the
              breeding residual at prime reproductive age (stallion prime 4–18, mare prime 3–16),
              factoring stud fee capitalization, blue-hen production, fertility, and foaling ease.
            </p>
            {isGelding && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-cream/70 font-semibold">Geldings</span> return zero
                breeding value — post-career is salvage value only (10% of racing).
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
