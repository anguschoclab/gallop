import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrackRecordsTable } from "@/components/history/TrackRecordsTable";
import type { RecordCategoryKind, TrackRecord } from "@/core/history/historyTypes";

const DIMENSIONS: { kind: RecordCategoryKind; label: string; blurb: string }[] = [
  { kind: "overall", label: "Overall", blurb: "Fastest time at each track, surface and trip" },
  { kind: "age", label: "By Age", blurb: "Best times by age group (2yo, 3yo, 4yo, 5yo+)" },
  { kind: "gender", label: "By Gender", blurb: "Best times by male and female runners" },
  { kind: "grade", label: "By Grade", blurb: "Best times set in G1, G2 and G3 company" },
  { kind: "condition", label: "By Going", blurb: "Best times by track condition on the day" },
];

const kindOf = (record: TrackRecord): RecordCategoryKind => record.categoryKind ?? "overall";

export function RecordAlmanac({ records }: { records: TrackRecord[] }) {
  const [kind, setKind] = useState<RecordCategoryKind>("overall");
  const [bucket, setBucket] = useState<string | null>(null);

  const byKind = useMemo(() => records.filter((r) => kindOf(r) === kind), [records, kind]);

  const buckets = useMemo(() => {
    const set = new Set<string>();
    for (const r of byKind) if (r.categoryValue) set.add(r.categoryValue);
    return Array.from(set).sort();
  }, [byKind]);

  const visible = useMemo(
    () => (bucket ? byKind.filter((r) => r.categoryValue === bucket) : byKind),
    [byKind, bucket],
  );

  const counts = useMemo(() => {
    const map = new Map<RecordCategoryKind, number>();
    for (const r of records) map.set(kindOf(r), (map.get(kindOf(r)) ?? 0) + 1);
    return map;
  }, [records]);

  const active = DIMENSIONS.find((d) => d.kind === kind)!;

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => (
              <button
                key={d.kind}
                type="button"
                onClick={() => {
                  setKind(d.kind);
                  setBucket(null);
                }}
                aria-pressed={kind === d.kind}
                className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                  kind === d.kind
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-cream-muted hover:text-cream"
                }`}
              >
                {d.label}
                <span className="ml-2 opacity-60 tabular-nums">{counts.get(d.kind) ?? 0}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-cream-muted">{active.blurb}</p>
          {buckets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setBucket(null)} aria-pressed={bucket === null}>
                <Badge variant={bucket === null ? "default" : "outline"} className="text-xs">
                  All
                </Badge>
              </button>
              {buckets.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBucket(b)}
                  aria-pressed={bucket === b}
                >
                  <Badge variant={bucket === b ? "default" : "outline"} className="text-xs">
                    {b}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TrackRecordsTable records={visible} />
    </div>
  );
}
