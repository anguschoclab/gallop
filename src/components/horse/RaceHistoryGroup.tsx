import { Badge } from "@/components/ui/badge";
import { gradeColor } from "@/core/common/uiTokens";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { getCountryFlag } from "@/core/common/countryFlag";

interface GradedHistoryEntry {
  raceId?: string;
  raceName: string;
  position: number;
  day: number;
  beyer?: number;
  grade?: "G1" | "G2" | "G3";
  distance?: number;
  surface?: string;
  fieldSize?: number;
}

interface RaceHistoryGroupProps {
  entries: GradedHistoryEntry[];
  countryFor: (r: GradedHistoryEntry) => string | undefined;
  yearFor: (day: number) => number;
}

export function RaceHistoryGroup({ entries, countryFor, yearFor }: RaceHistoryGroupProps) {
  return (
    <div className="space-y-1">
      {entries.map((r, i) => {
        const country = countryFor(r);
        const flag = r.grade === "G1" ? getCountryFlag(country) : null;
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              {r.grade && (
                <Badge variant="outline" className={gradeColor(r.grade)}>
                  {r.grade}
                </Badge>
              )}
              <div className="min-w-0">
                <div className="truncate">{r.raceName}</div>
                <div className="text-xs text-cream-muted flex items-center gap-1.5">
                  {flag && (
                    <span
                      title={country ?? "Unknown country"}
                      className="text-sm leading-none"
                    >
                      {flag}
                    </span>
                  )}
                  {r.grade === "G1" && (
                    <span className="tabular-nums">Y{yearFor(r.day)}</span>
                  )}
                  {r.distance ? <span>· {r.distance}m</span> : null}
                  {r.surface ? <span>· {r.surface}</span> : null}
                  {r.fieldSize ? <span>· field of {r.fieldSize}</span> : null}
                  <span>· D{r.day}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {typeof r.beyer === "number" && (
                <span className="text-xs">
                  <span className="text-cream-muted">
                    <JargonTooltip term="Beyer">Beyer</JargonTooltip>{" "}
                  </span>
                  <span className="font-semibold">{r.beyer}</span>
                </span>
              )}
              <Badge
                variant={
                  r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"
                }
              >
                {r.position}
                {getOrdinalSuffix(r.position)}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
