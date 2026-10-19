import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { RaceCenterTab } from "@/domains/racing/ui/RaceCenterTab";
import { RacesTab } from "@/domains/racing/ui/RacesTab";
import { CalendarTab } from "@/domains/racing/ui/CalendarTab";
import { BrowserTab } from "@/domains/racing/ui/BrowserTab";
import { SchedulerTab } from "@/domains/racing/ui/SchedulerTab";
import { NominationsTab } from "@/domains/racing/ui/NominationsTab";
import { useTabParam } from "@/shared/hooks/ui/useTabParam";
import { Calendar, Flag, Search, CalendarClock, Award } from "lucide-react";

const RACING_TABS = ["center", "races", "calendar", "browser", "scheduler", "nominations"] as const;

export const Route = createFileRoute("/racing")({
  validateSearch: z.object({
    tab: z.enum(RACING_TABS).optional(),
    grade: z.string().optional(),
    country: z.string().optional(),
    surface: z.string().optional(),
    track: z.string().optional(),
    owned: z.string().optional(),
    q: z.string().optional(),
    stableId: z.string().optional(),
    window: z.string().optional(),
    trip: z.string().optional(),
    eligibleOnly: z.string().optional(),
    openOnly: z.string().optional(),
  }),
  component: RacingPage,
});

function RacingPage() {
  const { tab, setTab } = useTabParam("center", RACING_TABS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
          Racing
        </h1>
        <p className="text-muted-foreground font-[family-name:var(--font-body)]">
          Race schedule, calendar, browser, and campaign scheduler
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof RACING_TABS)[number])}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="center" className="gap-2">
            <Flag className="h-4 w-4" />
            Race Center
          </TabsTrigger>
          <TabsTrigger value="races" className="gap-2">
            <Flag className="h-4 w-4" />
            All Races
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="browser" className="gap-2">
            <Search className="h-4 w-4" />
            Browser
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="nominations" className="gap-2">
            <Award className="h-4 w-4" />
            Nominations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="center" className="space-y-4">
          <RaceCenterTab />
        </TabsContent>

        <TabsContent value="races" className="space-y-4">
          <RacesTab />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarTab />
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <BrowserTab />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-4">
          <SchedulerTab />
        </TabsContent>

        <TabsContent value="nominations" className="space-y-4">
          <NominationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
