import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { buildDecadeLeaders, recordSpeed } from "@/core/history/almanacInsights";
import type { TrackRecord } from "@/core/history/historyTypes";

export function DecadeLeaders({ records }: { records: TrackRecord[] }) {
  const decades = useMemo(() => buildDecadeLeaders(records), [records]);

  if (decades.length === 0) {
    return (
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
          <CalendarRange className="h-4 w-4" />
          No records to rank by decade yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {decades.map((d) => (
        <Card key={d.decade} className="border-white/5 bg-slate-900/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-cream">{d.label}</h3>
              <Badge variant="outline" className="text-xs">
                {d.recordCount} records
              </Badge>
            </div>

            <ol className="space-y-1.5">
              {d.top.map((r, i) => (
                <li
                  key={`${r.trackId}-${r.distance}-${r.surface}-${r.categoryValue ?? "overall"}-${i}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 tabular-nums text-cream-muted">{i + 1}</span>
                    <span className="truncate font-medium text-cream">{r.horseName}</span>
                    <span className="truncate text-cream-muted">
                      {r.trackName} · {r.distance}m {r.surface}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-cream-muted">
                      {recordSpeed(r).toFixed(2)} m/s
                    </span>
                    <RaceTimeDisplay seconds={r.time} distance={r.distance} className="text-xs" />
                  </span>
                </li>
              ))}
            </ol>

            {d.prolific.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-cream-muted">
                  Most records
                </span>
                {d.prolific.map((h) => (
                  <Badge key={h.horseId} variant="secondary" className="text-[10px]">
                    {h.horseName} ×{h.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
