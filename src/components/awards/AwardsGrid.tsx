import { Badge } from "@/components/ui/badge";
import { AwardBadge } from "./AwardBadge";
import { Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { RegionalAward } from "@/core/awards/types";
import { CATEGORY_DISPLAY_NAMES, CATEGORY_DESCRIPTIONS } from "@/core/awards/types";
import { getRegionFlag, getRegionCountryLabel } from "@/core/common/countryFlag";
import { AWARD_COMPACT_THRESHOLD } from "@/constants/awardsConstants";

interface AwardsGridProps {
  awards: RegionalAward[];
}

export function AwardsGrid({ awards }: AwardsGridProps) {
  if (awards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No awards in this region yet.</p>
      </div>
    );
  }

  const buckets = new Map<string, RegionalAward[]>();
  for (const a of awards) {
    const list = buckets.get(a.category) ?? [];
    list.push(a);
    buckets.set(a.category, list);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from(buckets.entries()).flatMap(([category, list]) => {
        const sorted = [...list].sort((a, b) => b.year - a.year);
        if (sorted.length > AWARD_COMPACT_THRESHOLD) {
          const first = sorted[sorted.length - 1].year;
          const last = sorted[0].year;
          const sample = sorted[0];
          return [
            <Link
              key={`compact-${category}`}
              to="/awards/$category"
              params={{ category: sample.category }}
              title={CATEGORY_DESCRIPTIONS[sample.category]}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-2">
                  {CATEGORY_DISPLAY_NAMES[sample.category]}
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    ×{sorted.length}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {CATEGORY_DESCRIPTIONS[sample.category]}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span title={getRegionCountryLabel(sample.region)}>
                    {getRegionFlag(sample.region)}
                  </span>
                  <span>{getRegionCountryLabel(sample.region)}</span>
                  <span className="tabular-nums">
                    · Y{first}–Y{last}
                  </span>
                </div>
              </div>
            </Link>,
          ];
        }
        return sorted.map((award) => (
          <div key={award.id} className="space-y-1">
            <AwardBadge award={award} variant="card" showRegion />
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 pl-3">
              <span title={getRegionCountryLabel(award.region)}>{getRegionFlag(award.region)}</span>
              <span>{getRegionCountryLabel(award.region)}</span>
              <span className="tabular-nums">· Y{award.year}</span>
            </div>
          </div>
        ));
      })}
    </div>
  );
}
