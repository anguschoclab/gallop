import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { BreedingRadarChart } from "@/components/BreedingRadarChart";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import type { BreedingCompatibilityResult } from "@/game/types";

/**
 * Props for the BreedingCompatibilityCard component.
 */
interface BreedingCompatibilityCardProps {
  /** The calculated breeding compatibility result. */
  compatibility: BreedingCompatibilityResult;
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
      <BreedingRadarChart
        data={[
          {
            factor: "Nicking",
            score: compatibility.factors.nicking.score,
            fullMark: 100,
          },
          {
            factor: "Dosage",
            score: compatibility.factors.dosage.score,
            fullMark: 100,
          },
          {
            factor: "Inbreeding",
            score: compatibility.factors.inbreeding.score,
            fullMark: 100,
          },
          {
            factor: "Parent Performance",
            score: compatibility.factors.parentPerformance.score,
            fullMark: 100,
          },
          {
            factor: "Conformation",
            score: compatibility.factors.conformation.score,
            fullMark: 100,
          },
          {
            factor: "Temperament",
            score: compatibility.factors.temperament.score,
            fullMark: 100,
          },
          {
            factor: "Foundation Stock",
            score: compatibility.factors.foundationStock.score,
            fullMark: 100,
          },
          {
            factor: "Founder Effect",
            score: compatibility.factors.founderEffect.score,
            fullMark: 100,
          },
          {
            factor: "Genetic",
            score: compatibility.factors.genetic.score,
            fullMark: 100,
          },
          {
            factor: "Blue Hen",
            score: compatibility.factors.blueHen.score,
            fullMark: 100,
          },
        ]}
      />
      <Card className="bg-t700 border-gold-muted">
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
          <p className="text-cream-muted">{compatibility.recommendation}</p>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <JargonTooltip term="Nicking">Nicking</JargonTooltip>
              <span
                className={
                  compatibility.factors.nicking.score > 0 ? "text-success" : "text-cream-muted"
                }
              >
                {compatibility.factors.nicking.description}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <JargonTooltip term="Dosage">Dosage</JargonTooltip>
              <span
                className={
                  compatibility.factors.dosage.score >= 0.7 ? "text-success" : "text-cream-muted"
                }
              >
                {compatibility.factors.dosage.description}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <JargonTooltip term="Inbreeding">Inbreeding</JargonTooltip>
              <span
                className={
                  compatibility.factors.inbreeding.warning ? "text-warning" : "text-success"
                }
              >
                {compatibility.factors.inbreeding.description}
                {compatibility.factors.inbreeding.warning &&
                  ` (${compatibility.factors.inbreeding.warning})`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-cream-muted">
              <span>COI Depth</span>
              <span>8 generations (weighted)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Parent Performance</span>
              <span
                className={
                  compatibility.factors.parentPerformance.score >= 0.5
                    ? "text-success"
                    : "text-cream-muted"
                }
              >
                {compatibility.factors.parentPerformance.description}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium border-t pt-2 mt-2">
              <JargonTooltip term="Blue hen">Blue Hen Status</JargonTooltip>
              <span
                className={
                  compatibility.factors.blueHen.isBlueHen
                    ? "text-info"
                    : compatibility.factors.blueHen.score >= 0.5
                      ? "text-success"
                      : "text-cream-muted"
                }
              >
                {compatibility.factors.blueHen.description}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
