import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwardIconWithYear } from "./AwardIcon";
import { Link } from "@tanstack/react-router";
import { CATEGORY_DISPLAY_NAMES, CATEGORY_DESCRIPTIONS } from "@/core/awards/types";
import { getRegionCountryLabel } from "@/core/common/countryFlag";
import { Trophy } from "lucide-react";
import type { RegionalAward } from "@/core/awards/types";

const COMPACT_THRESHOLD = 5;

interface TrophyCompactViewProps {
  awards: RegionalAward[];
  totalAwards: number;
  className?: string;
}

export function TrophyCompactView({ awards, totalAwards, className }: TrophyCompactViewProps) {
  const sortedAwards = [...awards].sort((a, b) => b.year - a.year);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Trophy Case
          </CardTitle>
          <Badge variant="secondary">{totalAwards}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {totalAwards === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No awards yet. Win graded stakes to earn awards!
          </p>
        ) : (
          (() => {
            const buckets = new Map<string, RegionalAward[]>();
            for (const a of sortedAwards) {
              const list = buckets.get(a.category) ?? [];
              list.push(a);
              buckets.set(a.category, list);
            }
            const items: Array<
              | { kind: "single"; award: RegionalAward }
              | { kind: "count"; category: string; sample: RegionalAward; count: number }
            > = [];
            for (const [category, list] of buckets) {
              if (list.length > COMPACT_THRESHOLD) {
                items.push({ kind: "count", category, sample: list[0], count: list.length });
              } else {
                for (const a of list) items.push({ kind: "single", award: a });
              }
            }
            const display = items.slice(0, 10);
            const overflow = items.length - display.length;
            return (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {display.map((item) =>
                  item.kind === "single" ? (
                    <Link
                      key={item.award.id}
                      to="/awards/$category"
                      params={{ category: item.award.category }}
                      className="flex-shrink-0"
                      title={`${CATEGORY_DISPLAY_NAMES[item.award.category]} (${item.award.year}) · ${getRegionCountryLabel(item.award.region)} · ${CATEGORY_DESCRIPTIONS[item.award.category]}`}
                    >
                      <AwardIconWithYear
                        region={item.award.region}
                        category={item.award.category}
                        year={item.award.year}
                        size="small"
                      />
                    </Link>
                  ) : (
                    <Link
                      key={item.category}
                      to="/awards/$category"
                      params={{ category: item.sample.category }}
                      className="flex-shrink-0 flex items-center gap-1 px-2 h-8 rounded-full border border-gold/30 bg-gold/5"
                      title={`${CATEGORY_DISPLAY_NAMES[item.sample.category]} · ${item.count} years · ${CATEGORY_DESCRIPTIONS[item.sample.category]}`}
                    >
                      <AwardIconWithYear
                        region={item.sample.region}
                        category={item.sample.category}
                        year={item.sample.year}
                        size="small"
                      />
                      <span className="text-xs font-mono tabular-nums">×{item.count}</span>
                    </Link>
                  ),
                )}
                {overflow > 0 && (
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    <span className="text-xs text-muted-foreground">+{overflow}</span>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
