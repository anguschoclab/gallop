import { useMemo, useState } from "react";
import { History, Timer, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildTrackTimeline } from "@/core/history/almanacInsights";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import type { SeasonRecord, TrackRecord } from "@/core/history/historyTypes";

export function TrackHistoryTimeline({
  records,
  seasons,
}: {
  records: TrackRecord[];
  seasons: SeasonRecord[];
}) {
  const [trackId, setTrackId] = useState<string>("all");

  const tracks = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) map.set(r.trackId, r.trackName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records]);

  const events = useMemo(
    () =>
      buildTrackTimeline(records, seasons, trackId === "all" ? undefined : trackId).slice(0, 120),
    [records, seasons, trackId],
  );

  return (
    <div className="space-y-3">
      <PillToggleGroup
        options={[
          { value: "all", label: "All tracks" },
          ...tracks.map(([id, name]) => ({ value: id, label: name })),
        ]}
        value={trackId}
        onChange={setTrackId}
        ariaLabel="Track filter"
      />

      {events.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
            <History className="h-4 w-4" />
            No history recorded yet.
          </CardContent>
        </Card>
      ) : (
        <ol className="relative space-y-2 border-l border-white/10 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span
                className={`absolute -left-[21px] top-2 h-2 w-2 rounded-full ${
                  e.kind === "g1" ? "bg-gold" : "bg-primary"
                }`}
                aria-hidden
              />
              <Card className="border-white/5 bg-slate-900/40">
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {e.kind === "g1" ? (
                        <Trophy className="h-3.5 w-3.5 text-gold shrink-0" />
                      ) : (
                        <Timer className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate text-sm font-medium text-cream">{e.title}</span>
                    </div>
                    <p className="text-[11px] text-cream-muted truncate">{e.detail}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    Yr {e.year} · D{e.day}
                  </Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
