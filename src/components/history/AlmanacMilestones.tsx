import { useMemo, useState } from "react";
import { Landmark, Trophy, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { buildTrackMilestones } from "@/core/history/almanacInsights";
import type { SeasonRecord, TrackRecord } from "@/core/history/historyTypes";

export function AlmanacMilestones({
  records,
  seasons,
}: {
  records: TrackRecord[];
  seasons: SeasonRecord[];
}) {
  const [query, setQuery] = useState("");
  const milestones = useMemo(() => buildTrackMilestones(records, seasons), [records, seasons]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? milestones.filter((m) => m.trackName.toLowerCase().includes(needle))
      : milestones;
  }, [milestones, query]);

  if (milestones.length === 0) {
    return (
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
          <Landmark className="h-4 w-4" />
          No track records have been set yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tracks"
        aria-label="Filter tracks"
        className="w-full max-w-xs rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-cream placeholder:text-cream-muted"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((m) => (
          <Card key={m.trackId} className="border-white/5 bg-slate-900/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-cream">{m.trackName}</h3>
                  <p className="text-[10px] uppercase tracking-wide text-cream-muted">
                    {m.surfaces.join(" · ")} · {m.distances.length} trips
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {m.recordCount} records
                </Badge>
              </div>

              {m.fastest && (
                <div className="flex items-center justify-between gap-2 text-xs text-cream-muted">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-primary" />
                    Fastest: <span className="text-cream">{m.fastest.horseName}</span>{" "}
                    {m.fastest.distance}m {m.fastest.surface}
                  </span>
                  <RaceTimeDisplay
                    seconds={m.fastest.time}
                    distance={m.fastest.distance}
                    className="text-xs shrink-0"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] text-cream-muted">
                <span>First record: Year {m.earliest?.year ?? "—"}</span>
                <span>Latest record: Year {m.latest?.year ?? "—"}</span>
              </div>

              {m.g1Count > 0 && (
                <p className="flex items-center gap-1.5 text-[11px] text-cream-muted">
                  <Trophy className="h-3.5 w-3.5 text-gold" />
                  {m.g1Count} Grade 1 result{m.g1Count === 1 ? "" : "s"} logged here
                </p>
              )}

              {m.multiRecordHolders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.multiRecordHolders.slice(0, 4).map((h) => (
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
    </div>
  );
}
