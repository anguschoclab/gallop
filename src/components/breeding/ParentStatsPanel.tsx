/**
 * ParentStatsPanel.tsx - Displays side-by-side sire/dam stats for breeding
 *
 * Extracted from BreedingShedTab.tsx.
 */

import type { Horse } from "@/game/types";
import type { ReactNode } from "react";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-cream/40">{label}</span>
      <span className="text-cream tabular-nums text-right">{value}</span>
    </div>
  );
}

const runStyleLabel: Record<string, string> = {
  E: "Early (Front)",
  EP: "Early/Presser",
  P: "Presser",
  S: "Sustainer/Closer",
};

interface ParentStatsPanelProps {
  sire: Horse;
  dam: Horse;
}

export function ParentStatsPanel({ sire, dam }: ParentStatsPanelProps) {
  const parents = [
    { h: sire, role: "Sire" },
    { h: dam, role: "Dam" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
      {parents.map(({ h, role }) => {
        const bestSurface = (Object.entries(h.surfaceAptitude || {}) as [string, number][]).sort(
          (a, b) => b[1] - a[1],
        )[0];
        return (
          <div key={role} className="bg-black/20 border border-white/5 p-3 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-cream/30 mb-2">
              {h.name} · {role}
            </div>
            <div className="text-[10px] font-mono space-y-0.5">
              <Row
                label="Pref. Distance"
                value={h.distanceAptitude ? `${Math.round(h.distanceAptitude)}m` : "—"}
              />
              <Row
                label="Best Surface"
                value={bestSurface ? `${bestSurface[0]} (${Math.round(bestSurface[1])})` : "—"}
              />
              <Row
                label="Running Style"
                value={runStyleLabel[h.runningStyle] || h.runningStyle || "—"}
              />
              <Row label="Stride" value={h.strideType || "—"} />
              <Row label="Peak Age" value={h.peakAge ?? "—"} />
              <Row label="Heart" value={h.heartScore != null ? Math.round(h.heartScore) : "—"} />
              <Row
                label="Trainability"
                value={h.trainability != null ? Math.round(h.trainability) : "—"}
              />
              <Row
                label="Temperament"
                value={h.stats?.temperament != null ? Math.round(h.stats.temperament) : "—"}
              />
              <Row
                label="Spd / Sta / Acc"
                value={
                  h.stats
                    ? `${Math.round(h.stats.speed)} / ${Math.round(h.stats.stamina)} / ${Math.round(h.stats.acceleration)}`
                    : "—"
                }
              />
              {h.bruceLoweFamily != null && (
                <Row label="Bruce Lowe" value={`BL${h.bruceLoweFamily}`} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
