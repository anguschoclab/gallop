import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwardIcon } from "./AwardIcon";
import { AwardBadge } from "./AwardBadge";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import type { RegionalAward, RegionalAwardCategory } from "@/core/awards/types";
import { CATEGORY_DISPLAY_NAMES } from "@/core/awards/types";
import { getRegionFlag, getRegionCountryLabel } from "@/core/common/countryFlag";
import { Trophy, Award, Star } from "lucide-react";
import { VisualTrophy, TrophyShelf } from "./VisualTrophy";

interface HorseAwardsPanelProps {
  horse: Horse;
  className?: string;
}

const COMPACT_THRESHOLD = 5;

function renderCompactCategory(category: RegionalAwardCategory, sorted: RegionalAward[]) {
  const first = sorted[sorted.length - 1].year;
  const last = sorted[0].year;
  return (
    <div
      key={category}
      className="flex items-center justify-between gap-2 p-2 rounded-md border border-gold/20 bg-card"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AwardIcon region={sorted[0].region} category={category} size="tiny" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{CATEGORY_DISPLAY_NAMES[category]}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span title={getRegionCountryLabel(sorted[0].region)}>
              {getRegionFlag(sorted[0].region)}
            </span>
            <span>
              Y{first}–Y{last}
            </span>
          </div>
        </div>
      </div>
      <Badge variant="secondary" className="font-mono tabular-nums shrink-0">
        ×{sorted.length}
      </Badge>
    </div>
  );
}

function renderExpandedAwards(sorted: RegionalAward[]) {
  return sorted.map((award) => (
    <div key={award.id} className="flex items-center justify-between gap-2">
      <AwardBadge award={award} variant="inline" showYear />
      <span
        className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"
        title={getRegionCountryLabel(award.region)}
      >
        <span>{getRegionFlag(award.region)}</span>
        <span className="hidden sm:inline">{getRegionCountryLabel(award.region)}</span>
      </span>
    </div>
  ));
}

export function HorseAwardsPanel({ horse, className }: HorseAwardsPanelProps) {
  const awards = useGame((s) => s.awards);

  // Get awards for this horse
  const horseAwards = awards.filter((a) => a.horseId === horse.id);

  if (horseAwards.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No awards yet. Win graded stakes to earn regional championships!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by year descending, HOTY first
  const sortedAwards = [...horseAwards].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.category === "horse_of_the_year") return -1;
    if (b.category === "horse_of_the_year") return 1;
    return 0;
  });

  const hotyAwards = sortedAwards.filter((a) => a.category === "horse_of_the_year");
  const categoryAwards = sortedAwards.filter((a) => a.category !== "horse_of_the_year");

  // Group category awards by category name; collapse to ×N when years > threshold
  const byCategory = new Map<RegionalAwardCategory, RegionalAward[]>();
  for (const a of categoryAwards) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Awards
          </CardTitle>
          <Badge variant="secondary">{horseAwards.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* HOTY Highlight */}
        {hotyAwards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Star className="w-3 h-3" />
              Horse of the Year
            </h4>
            <TrophyShelf count={hotyAwards.length}>
              {hotyAwards.map((award) => (
                <VisualTrophy
                  key={award.id}
                  tone="platinum"
                  size={72}
                  label="HOTY"
                  sublabel={`Y${award.year}`}
                  flag={getRegionFlag(award.region)}
                  title={`Horse of the Year · ${getRegionCountryLabel(award.region)} · Y${award.year}`}
                />
              ))}
            </TrophyShelf>
          </div>
        )}

        {/* Category Awards — compact when a category exceeds COMPACT_THRESHOLD years */}
        {categoryAwards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Award className="w-3 h-3" />
              Championships
            </h4>
            <div className="grid gap-2">
              {Array.from(byCategory.entries()).map(([category, list]) => {
                const sorted = [...list].sort((a, b) => b.year - a.year);
                if (sorted.length > COMPACT_THRESHOLD) {
                  return renderCompactCategory(category, sorted);
                }
                return renderExpandedAwards(sorted);
              })}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{sortedAwards.length}</div>
              <div className="text-xs text-muted-foreground">Total Awards</div>
            </div>
            <div>
              <div className="text-lg font-bold">{hotyAwards.length}</div>
              <div className="text-xs text-muted-foreground">HOTY</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {Math.max(...sortedAwards.map((a) => a.year)) -
                  Math.min(...sortedAwards.map((a) => a.year)) +
                  1}
              </div>
              <div className="text-xs text-muted-foreground">Years Active</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export so callers can keep cn in tree-shake graph if needed
export { cn };
