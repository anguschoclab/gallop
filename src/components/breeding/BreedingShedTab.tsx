import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { BreedingCompatibilityCard } from "@/components/breeding/BreedingCompatibilityCard";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";
import type { useBreedingPage } from "@/hooks/useBreedingPage";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-cream/40">{label}</span>
      <span className="text-cream tabular-nums text-right">{value}</span>
    </div>
  );
}

interface BreedingShedTabProps {
  pageData: ReturnType<typeof useBreedingPage>;
}

export function BreedingShedTab({ pageData }: BreedingShedTabProps) {
  const {
    sireId,
    setSireId,
    damId,
    setDamId,
    liveFoalGuarantee,
    setLiveFoalGuarantee,
    availableStallions,
    femalesToBreed,
    cash,
    sire,
    dam,
    compatibility,
    breed,
    seasonOpen,
    nextSeasonStart,
  } = pageData;

  const onBreed = () => {
    if (!sireId || !damId) return;
    if (!seasonOpen) {
      toast.error(`Breeding season closed. Reopens day ${nextSeasonStart}.`);
      return;
    }
    const result = breed(sireId, damId, liveFoalGuarantee);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    setSireId("");
    setDamId("");
    setLiveFoalGuarantee(false);
  };

  const runStyleLabel: Record<string, string> = {
    E: "Early (Front)",
    EP: "Early/Presser",
    P: "Presser",
    S: "Sustainer/Closer",
  };

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="font-[family-name:var(--font-display)]">New Mating</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-cream-muted">
              <JargonTooltip term="Sire">Sire</JargonTooltip>
            </label>
            <select
              className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
              value={sireId}
              onChange={(e) => setSireId(e.target.value)}
            >
              <option value="">Select sire…</option>
              {availableStallions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} (age {Math.floor(h.age)})
                  {h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""} •{" "}
                  {Math.round(h.distanceAptitude)}m • ${formatCurrency(h.stud?.standingFee || 0)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cream-muted">
              <JargonTooltip term="Dam">Dam</JargonTooltip>
            </label>
            <select
              className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
              value={damId}
              onChange={(e) => setDamId(e.target.value)}
            >
              <option value="">Select dam…</option>
              {femalesToBreed.map((h: any) => (
                <option key={h.id} value={h.id}>
                  {h.name} (age {Math.floor(h.age)})
                  {h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""} •{" "}
                  {Math.round(h.distanceAptitude)}m
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          onClick={onBreed}
          disabled={
            !sireId ||
            !damId ||
            sireId === damId ||
            cash < 2000 + (liveFoalGuarantee ? 1000 : 0)
          }
        >
          <Heart className="h-4 w-4 mr-1" /> Breed (
          <span className="tabular-nums">${liveFoalGuarantee ? "3,000" : "2,000"}</span>)
        </Button>

        <div className="flex items-center space-x-2 mt-3">
          <input
            type="checkbox"
            id="liveFoalGuarantee"
            checked={liveFoalGuarantee}
            onChange={(e) => setLiveFoalGuarantee(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="liveFoalGuarantee" className="text-sm cursor-pointer">
            Live Foal Guarantee (<span className="tabular-nums">+$1,000</span>)
          </label>
        </div>
        <p className="text-xs text-cream-muted mt-1">
          If <JargonTooltip term="Foal">foal</JargonTooltip> is stillborn or unable to
          stand/nurse, you get a free re-breeding (up to 3 attempts).
        </p>

        {compatibility && <BreedingCompatibilityCard compatibility={compatibility} />}

        {sire && dam && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            {[
              { h: sire, role: "Sire" },
              { h: dam, role: "Dam" },
            ].map(({ h, role }) => {
              const bestSurface = (
                Object.entries(h.surfaceAptitude || {}) as [string, number][]
              ).sort((a, b) => b[1] - a[1])[0];
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
                      value={
                        bestSurface
                          ? `${bestSurface[0]} (${Math.round(bestSurface[1])})`
                          : "—"
                      }
                    />
                    <Row
                      label="Running Style"
                      value={runStyleLabel[h.runningStyle] || h.runningStyle || "—"}
                    />
                    <Row label="Stride" value={h.strideType || "—"} />
                    <Row label="Peak Age" value={h.peakAge ?? "—"} />
                    <Row
                      label="Heart"
                      value={h.heartScore != null ? Math.round(h.heartScore) : "—"}
                    />
                    <Row
                      label="Trainability"
                      value={h.trainability != null ? Math.round(h.trainability) : "—"}
                    />
                    <Row
                      label="Temperament"
                      value={
                        h.stats?.temperament != null ? Math.round(h.stats.temperament) : "—"
                      }
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
        )}
      </CardContent>
    </Card>
  );
}
