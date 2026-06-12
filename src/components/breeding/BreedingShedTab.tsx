import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { BreedingCompatibilityCard } from "@/components/breeding/BreedingCompatibilityCard";
import { SireSelector } from "./SireSelector";
import { DamSelector } from "./DamSelector";
import { ParentStatsPanel } from "./ParentStatsPanel";
import { formatCurrency } from "@/core/common/formatting";
import { toast } from "sonner";
import type { useBreedingPage } from "@/hooks/breeding/useBreedingPage";

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

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="font-[family-name:var(--font-display)]">New Mating</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SireSelector
            sireId={sireId}
            onChange={setSireId}
            availableStallions={availableStallions}
          />
          <DamSelector damId={damId} onChange={setDamId} femalesToBreed={femalesToBreed} />
        </div>
        <Button
          onClick={onBreed}
          disabled={
            !sireId || !damId || sireId === damId || cash < 2000 + (liveFoalGuarantee ? 1000 : 0)
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
          If foal is stillborn or unable to stand/nurse, you get a free re-breeding (up to 3
          attempts).
        </p>

        {compatibility && <BreedingCompatibilityCard compatibility={compatibility} />}

        {sire && dam && <ParentStatsPanel sire={sire} dam={dam} />}
      </CardContent>
    </Card>
  );
}
