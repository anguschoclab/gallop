import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Trophy, Rss, BookOpen } from "lucide-react";
import { useTabParam } from "@/hooks/ui/useTabParam";
import { GazetteTab } from "@/components/briefing/GazetteTab";
import { RecapTab } from "@/components/briefing/RecapTab";
import { NewsTab } from "@/components/briefing/NewsTab";
import { StorylinesTab } from "@/components/briefing/StorylinesTab";

const BRIEFING_TABS = ["gazette", "recap", "news", "storylines"] as const;

export const Route = createFileRoute("/briefing")({
  validateSearch: z.object({ tab: z.enum(BRIEFING_TABS).optional() }),
  component: BriefingPage,
});

function BriefingPage() {
  const { tab, setTab } = useTabParam("gazette", BRIEFING_TABS);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Briefing
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          The Gazette, race recaps, and the latest from around the circuit.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof BRIEFING_TABS)[number])}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="gazette" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Gazette
          </TabsTrigger>
          <TabsTrigger value="recap" className="gap-2">
            <Trophy className="h-4 w-4" />
            Recap
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Rss className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="storylines" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Storylines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gazette" className="space-y-4">
          <GazetteTab />
        </TabsContent>
        <TabsContent value="recap" className="space-y-4">
          <RecapTab />
        </TabsContent>
        <TabsContent value="news" className="space-y-4">
          <NewsTab />
        </TabsContent>
        <TabsContent value="storylines" className="space-y-4">
          <StorylinesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
