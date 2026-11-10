import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Info } from "lucide-react";
import { BreedingRadarChart } from "@/domains/breeding/ui/BreedingRadarChart";
import { JargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import type { BreedingCompatibilityResult } from "@/platform/game/types";

/**
 * Props for the BreedingCompatibilityCard component.
 */
interface BreedingCompatibilityCardProps {
  /** The calculated breeding compatibility result. */
  compatibility: BreedingCompatibilityResult;
}

function buildRadarData(compatibility: BreedingCompatibilityResult) {
  const { factors } = compatibility;
  return [
    { factor: "Nicking", score: factors.nicking.score, fullMark: 100 },
    { factor: "Dosage", score: factors.dosage.score, fullMark: 100 },
    { factor: "Inbreeding", score: factors.inbreeding.score, fullMark: 100 },
    { factor: "Parent Performance", score: factors.parentPerformance.score, fullMark: 100 },
    { factor: "Conformation", score: factors.conformation.score, fullMark: 100 },
    { factor: "Temperament", score: factors.temperament.score, fullMark: 100 },
    { factor: "Foundation Stock", score: factors.foundationStock.score, fullMark: 100 },
    { factor: "Founder Effect", score: factors.founderEffect.score, fullMark: 100 },
    { factor: "Genetic", score: factors.genetic.score, fullMark: 100 },
    { factor: "Blue Hen", score: factors.blueHen.score, fullMark: 100 },
  ];
}

/**
 * Component to display detailed breeding compatibility between two horses.
 * Includes a radar chart of factors and a breakdown of scores and recommendations.
 *
 * EXTRACTED FROM: src/routes/breeding.tsx
 */
export function BreedingCompatibilityCard({ compatibility }: BreedingCompatibilityCardProps) {
  return (
    <div className="space-y-4">
      <BreedingRadarChart data={buildRadarData(compatibility)} />
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Breeding Compatibility Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Score</span>
            <Badge
              variant={
                compatibility.overallScore >= 0.65
                  ? "default"
                  : compatibility.overallScore >= 0.5
                    ? "secondary"
                    : "destructive"
              }
              className="tabular-nums"
            >
              {Math.round(compatibility.overallScore * 100)}%
            </Badge>
          </div>
          <p className="text-muted-foreground">{compatibility.recommendation}</p>

          <div className="space-y-2 pt-2 border-t">
            <FactorRows factors={compatibility.factors} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FactorRows({ factors }: { factors: BreedingCompatibilityResult["factors"] }) {
  return (
    <>
      <div className="flex items-center justify-between text-xs">
        <JargonTooltip term="Nicking">Nicking</JargonTooltip>
        <span className={factors.nicking.score > 0 ? "text-success" : "text-muted-foreground"}>
          {factors.nicking.description}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <JargonTooltip term="Dosage">Dosage</JargonTooltip>
        <span className={factors.dosage.score >= 0.7 ? "text-success" : "text-muted-foreground"}>
          {factors.dosage.description}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <JargonTooltip term="Inbreeding">Inbreeding</JargonTooltip>
        <span className={factors.inbreeding.warning ? "text-warning" : "text-success"}>
          {factors.inbreeding.description}
          {factors.inbreeding.warning && ` (${factors.inbreeding.warning})`}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>COI Depth</span>
        <span>8 generations (weighted)</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>Parent Performance</span>
        <span
          className={
            factors.parentPerformance.score >= 0.5 ? "text-success" : "text-muted-foreground"
          }
        >
          {factors.parentPerformance.description}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs font-medium border-t pt-2 mt-2">
        <JargonTooltip term="Blue hen">Blue Hen Status</JargonTooltip>
        <span
          className={
            factors.blueHen.isBlueHen
              ? "text-info"
              : factors.blueHen.score >= 0.5
                ? "text-success"
                : "text-muted-foreground"
          }
        >
          {factors.blueHen.description}
        </span>
      </div>
    </>
  );
}
