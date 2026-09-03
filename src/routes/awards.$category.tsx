import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy } from "lucide-react";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
  REGION_AWARD_NAMES,
  type AwardRegion,
  type RegionalAwardCategory,
} from "@/core/awards/types";
import { BackLink } from "@/components/charts/BackLink";

const ALL_CATEGORIES = new Set<string>(Object.keys(CATEGORY_DISPLAY_NAMES));

const REGIONS: AwardRegion[] = ["north_america", "europe", "asia_pacific", "south_america"];

export const Route = createFileRoute("/awards/$category")({
  head: () => ({
    meta: [
      { title: "Award Category History — Stable Honors" },
      {
        name: "description",
        content: "View all past winners of this award category across all regions and years.",
      },
      { property: "og:title", content: "Award Category History — Stable Honors" },
      {
        property: "og:description",
        content: "View all past winners of this award category across all regions and years.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoryHistoryPage,
});

function CategoryHistoryPage() {
  const { category } = Route.useParams();
  const awards = useGame((s: GameState) => s.awards);

  if (!ALL_CATEGORIES.has(category)) {
    return (
      <div className="container mx-auto p-6 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-cream font-[family-name:var(--font-display)]">
          Category not found
        </h1>
        <p className="text-cream-muted">The award category "{category}" is not recognized.</p>
        <Link
          to="/honors"
          search={{ tab: "awards" as const }}
          className="text-sm text-gold hover:underline"
        >
          Back to Awards
        </Link>
      </div>
    );
  }

  const typedCategory = category as RegionalAwardCategory;
  const displayName = CATEGORY_DISPLAY_NAMES[typedCategory];
  const description = CATEGORY_DESCRIPTIONS[typedCategory];
  const categoryAwards = awards
    .filter((a) => a.category === typedCategory)
    .sort((a, b) => b.year - a.year);

  const byRegion: Record<string, typeof categoryAwards> = {};
  for (const region of REGIONS) {
    byRegion[region] = categoryAwards.filter((a) => a.region === region);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <BackLink
        to="/honors"
        label="Back to Awards"
        search={{ tab: "awards" }}
        className="text-sm text-cream-muted hover:text-gold gap-2"
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)] flex items-center gap-3">
          <Trophy className="h-7 w-7 text-gold" />
          {displayName}
        </h1>
        <p className="text-cream-muted text-sm leading-relaxed">{description}</p>
        <div className="text-xs text-cream-muted">
          {categoryAwards.length} award{categoryAwards.length === 1 ? "" : "s"} across all regions
        </div>
      </div>

      {categoryAwards.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="py-8 text-center text-cream-muted">
            No winners have been determined for this category yet.
          </CardContent>
        </Card>
      ) : (
        REGIONS.map((region) => {
          const regionAwards = byRegion[region];
          if (regionAwards.length === 0) return null;
          return (
            <Card key={region} className="border-gold-muted">
              <CardHeader>
                <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
                  {REGION_AWARD_NAMES[region]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {regionAwards.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-gold text-gold font-mono">
                        Y{a.year}
                      </Badge>
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: a.horseId }}
                        className="font-semibold text-cream hover:text-gold"
                      >
                        {a.horseName}
                      </Link>
                      {a.isHistoric && (
                        <span className="text-xs text-gold" title="Historic victory">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-cream-muted">
                      {a.points} pts
                      {a.runnerUpPoints > 0 && ` · runner-up ${a.runnerUpPoints} pts`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
