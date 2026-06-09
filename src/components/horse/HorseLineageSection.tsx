import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import { PedigreeTree } from "@/components/breeding/PedigreeTree";
import { Link } from "@tanstack/react-router";

interface HorseLineageSectionProps {
  horse: any;
  horseId: string;
  progenyPregnancies: any[];
  reBreedingPregnancies: any[];
  localHorseMap: Map<string, any>;
}

export function HorseLineageSection({
  horse,
  horseId,
  progenyPregnancies,
  reBreedingPregnancies,
  localHorseMap,
}: HorseLineageSectionProps) {
  return (
    <section id="lineage" className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-blue-400" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Heritage &amp; Ancestry
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardContent className="p-6 space-y-6">
          {horse.sireId || horse.damId ? (
            <PedigreeTree horseId={horseId} />
          ) : (
            <p className="text-xs text-cream/30 italic font-mono">
              No pedigree data available.
            </p>
          )}

          {progenyPregnancies.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <div className="text-[10px] font-black uppercase text-blue-400/40 tracking-widest">
                Progeny
              </div>
              <div className="space-y-1">
                {progenyPregnancies.map((p: any) => {
                  const sire = localHorseMap.get(p.sireId);
                  const dam = localHorseMap.get(p.damId);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 bg-black/20 border border-white/5 text-xs font-mono"
                    >
                      <div className="text-cream/60">
                        {sire ? (
                          <Link
                            to="/stable/$horseId"
                            params={{ horseId: sire.id }}
                            className="hover:text-blue-400"
                          >
                            {sire.name}
                          </Link>
                        ) : (
                          "?"
                        )}{" "}
                        ×{" "}
                        {dam ? (
                          <Link
                            to="/stable/$horseId"
                            params={{ horseId: dam.id }}
                            className="hover:text-blue-400"
                          >
                            {dam.name}
                          </Link>
                        ) : (
                          "?"
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="border-white/10 text-cream/40 text-[9px] rounded-none"
                      >
                        {p.resolved ? "BORN" : "IN UTERO"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reBreedingPregnancies.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <div className="text-[10px] font-black uppercase text-blue-400/40 tracking-widest">
                Re-Breeding History
              </div>
              <div className="space-y-1">
                {reBreedingPregnancies.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 bg-black/20 border border-white/5 text-xs font-mono"
                  >
                    <span className="text-cream/60">
                      Attempts: {p.reBreedingAttempts ?? 0}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-white/10 text-cream/40 text-[9px] rounded-none"
                    >
                      {p.liveFoalGuarantee ? "LFG" : "STANDARD"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
