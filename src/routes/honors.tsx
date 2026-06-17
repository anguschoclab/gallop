import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HallOfFameTab } from "@/components/honors/HallOfFameTab";
import { RecordsTab } from "@/components/honors/RecordsTab";
import { AwardsTab } from "@/components/honors/AwardsTab";
import { useTabParam } from "@/hooks/ui/useTabParam";
import { Trophy, Medal, Award } from "lucide-react";

const HONORS_TABS = ["hall-of-fame", "records", "awards"] as const;

export const Route = createFileRoute("/honors")({
  validateSearch: z.object({
    tab: z.enum(HONORS_TABS).optional(),
  }),
  component: HonorsPage,
});

function HonorsPage() {
  const { tab, setTab } = useTabParam("hall-of-fame", HONORS_TABS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Honors
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Hall of Fame, records, and awards
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof HONORS_TABS)[number])}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="hall-of-fame" className="gap-2">
            <Trophy className="h-4 w-4" />
            Hall of Fame
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2">
            <Medal className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="awards" className="gap-2">
            <Award className="h-4 w-4" />
            Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hall-of-fame" className="space-y-4">
          <HallOfFameTab />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <RecordsTab />
        </TabsContent>

        <TabsContent value="awards" className="space-y-4">
          <AwardsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
