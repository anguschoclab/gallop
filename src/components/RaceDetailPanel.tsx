import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GradedRace } from "@/game/gradedRaces";
import { formatGenderRestriction, formatAgeRestrictions, formatAllRestrictions } from "@/core/race/restrictions";

interface RaceDetailPanelProps {
  race: {
    purse: number;
    distance: number;
    graded?: {
      grade: "G1" | "G2" | "G3";
      track: string;
      surface: "Turf" | "Dirt" | "Synthetic";
    };
    restrictions?: {
      minAge?: number;
      maxAge?: number;
      gender?: string;
      minAgeNorthern?: number;
      minAgeSouthern?: number;
    };
  };
}

export function RaceDetailPanel({ race }: RaceDetailPanelProps) {
  const { purse, distance, graded, restrictions } = race;

  const formatRestrictions = () => {
    if (!restrictions) return ["Open"];

    const parts: string[] = [];

    // Handle hemisphere-specific age restrictions
    if (restrictions.minAgeNorthern !== undefined || restrictions.minAgeSouthern !== undefined) {
      const north = restrictions.minAgeNorthern ?? restrictions.minAge;
      const south = restrictions.minAgeSouthern ?? restrictions.minAge;
      if (north === south) {
        parts.push(`${north}+ YO`);
      } else {
        parts.push(`${north}+ YO (Northern) / ${south}+ YO (Southern)`);
      }
    } else {
      // Use shared formatting for standard age restrictions
      const ageStr = formatAgeRestrictions(restrictions);
      if (ageStr) parts.push(ageStr);
    }

    // Use shared formatting for gender restrictions
    const genderStr = formatGenderRestriction(restrictions.gender);
    if (genderStr) parts.push(genderStr);

    return parts.length > 0 ? parts : ["Open"];
  };

  const restrictionLabels = formatRestrictions();

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Purse</span>
            <div className="font-semibold text-foreground">${purse.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Distance</span>
            <div className="font-semibold text-foreground">{distance}m</div>
          </div>
          {graded && (
            <>
              <div>
                <span className="text-muted-foreground">Surface</span>
                <div className="font-semibold text-foreground">{graded.surface}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Track</span>
                <div className="font-semibold text-foreground">{graded.track}</div>
              </div>
            </>
          )}
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Eligibility</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {restrictionLabels.map((label, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
