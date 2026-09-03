import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BookOpen, CalendarRange, Globe2, History, Landmark, ScrollText, Timer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameWithShallow } from "@/game/store";
import { RecordAlmanac } from "@/components/history/RecordAlmanac";
import { AlmanacMilestones } from "@/components/history/AlmanacMilestones";
import { DecadeLeaders } from "@/components/history/DecadeLeaders";
import { TrackHistoryTimeline } from "@/components/history/TrackHistoryTimeline";
import { RealWorldBenchmarks } from "@/components/history/RealWorldBenchmarks";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import type { SeasonRecord, TrackRecord } from "@/core/history/historyTypes";

const ALMANAC_TABS = [
  "records",
  "milestones",
  "decades",
  "timeline",
  "real-world",
  "roll-of-honour",
] as const;
const EMPTY_OBJECT = {} as Record<string, never>;
const EMPTY_ARRAY: SeasonRecord[] = [];


export const Route = createFileRoute("/almanac")({
  validateSearch: z.object({
    tab: z.enum(ALMANAC_TABS).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Almanac — Track Records & Roll of Honour" },
      {
        name: "description",
        content:
          "Browse all-time track records by age, gender, grade and going, plus the Grade 1 roll of honour.",
      },
      { property: "og:title", content: "Almanac — Track Records & Roll of Honour" },
      {
        property: "og:description",
        content: "All-time track records by category and every Grade 1 winner in your world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlmanacPage,
});

function AlmanacPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const trackRecords = useGameWithShallow((s) => s.trackRecords ?? EMPTY_OBJECT) as Record<
    string,
    TrackRecord
  >;
  const seasonRecords = useGameWithShallow((s) => s.seasonRecords ?? EMPTY_ARRAY) as SeasonRecord[];

  const records = useMemo(() => Object.values(trackRecords), [trackRecords]);
  const honours = useMemo(
    () => [...seasonRecords].sort((a, b) => b.day - a.day),
    [seasonRecords],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Almanac
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Track records by age, gender, grade and going — plus every Grade 1 result
        </p>
      </div>

      <Tabs
        value={tab ?? "records"}
        onValueChange={(v) =>
          navigate({ search: { tab: v as (typeof ALMANAC_TABS)[number] } })
        }
        className="space-y-4"
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="records" className="gap-2">
            <Timer className="h-4 w-4" />
            Track Records
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Landmark className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="decades" className="gap-2">
            <CalendarRange className="h-4 w-4" />
            By Decade
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <History className="h-4 w-4" />
            Track History
          </TabsTrigger>
          <TabsTrigger value="real-world" className="gap-2">
            <Globe2 className="h-4 w-4" />
            Real-World
          </TabsTrigger>
          <TabsTrigger value="roll-of-honour" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Roll of Honour
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <RecordAlmanac records={records} />
        </TabsContent>

        <TabsContent value="milestones">
          <AlmanacMilestones records={records} seasons={honours} />
        </TabsContent>

        <TabsContent value="decades">
          <DecadeLeaders records={records} />
        </TabsContent>

        <TabsContent value="timeline">
          <TrackHistoryTimeline records={records} seasons={honours} />
        </TabsContent>

        <TabsContent value="real-world">
          <RealWorldBenchmarks records={records} />
        </TabsContent>


        <TabsContent value="roll-of-honour" className="space-y-2">
          {honours.length === 0 ? (
            <Card className="border-white/5 bg-slate-900/40">
              <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                No Grade 1 races have been run yet.
              </CardContent>
            </Card>
          ) : (
            honours.map((r) => (
              <Card key={r.id} className="border-white/5 bg-slate-900/40">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {r.grade}
                      </Badge>
                      <span className="truncate text-cream font-semibold">{r.raceName}</span>
                    </div>
                    <p className="text-xs text-cream-muted">
                      Year {r.year} · Day {r.day} · {r.winnerName} · {r.jockeyName}
                    </p>
                  </div>
                  <RaceTimeDisplay seconds={r.time} distance={0} className="text-sm shrink-0" />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
