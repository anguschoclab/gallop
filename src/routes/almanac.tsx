import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  BookOpen,
  CalendarRange,
  Globe2,
  History,
  Landmark,
  Newspaper,
  ScrollText,
  Timer,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useGameWithShallow } from "@/platform/game/store";
import { AlmanacNewsFeed } from "@/domains/history/ui/AlmanacNewsFeed";
import { RecordAlmanac } from "@/domains/history/ui/RecordAlmanac";
import { AlmanacMilestones } from "@/domains/history/ui/AlmanacMilestones";
import { DecadeLeaders } from "@/domains/history/ui/DecadeLeaders";
import { TrackHistoryTimeline } from "@/domains/history/ui/TrackHistoryTimeline";
import { RealWorldBenchmarks } from "@/domains/history/ui/RealWorldBenchmarks";
import { RaceTimeDisplay } from "@/domains/race/ui/RaceTimeDisplay";
import type { SeasonRecord, TrackRecord } from "@/domains/history/application/historyFacade";

const ALMANAC_TABS = [
  "news",
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
      { title: "Almanac — News Feed, Track Records & Roll of Honour" },
      {
        name: "description",
        content:
          "Browse historical news feed, horse transfers, all-time track records by category, and the Grade 1 roll of honour.",
      },
      { property: "og:title", content: "Almanac — News Feed, Track Records & Roll of Honour" },
      {
        property: "og:description",
        content:
          "All-time track events, horse transfers, stable news timeline, and every Grade 1 winner in your world.",
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
  const honours = useMemo(() => [...seasonRecords].sort((a, b) => b.day - a.day), [seasonRecords]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
          Almanac
        </h1>
        <p className="text-muted-foreground font-[family-name:var(--font-body)]">
          Track records, world news feed, transfer timeline, and the Grade 1 roll of honour
        </p>
      </div>

      <Tabs
        value={tab ?? "records"}
        onValueChange={(v) => navigate({ search: { tab: v as (typeof ALMANAC_TABS)[number] } })}
        className="space-y-4"
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            News Feed
          </TabsTrigger>
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

        <TabsContent value="news">
          <AlmanacNewsFeed />
        </TabsContent>

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
              <CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
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
                      <span className="truncate text-foreground font-semibold">{r.raceName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
