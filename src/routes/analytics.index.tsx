import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsOverviewTab } from "@/components/analytics/AnalyticsOverviewTab";
import { AnalyticsStableTab } from "@/components/analytics/AnalyticsStableTab";
import { AnalyticsRacingTab } from "@/components/analytics/AnalyticsRacingTab";
import { AnalyticsFinanceTab } from "@/components/analytics/AnalyticsFinanceTab";
import { AnalyticsBreedingTab } from "@/components/analytics/AnalyticsBreedingTab";
import { RivalIntelTab } from "@/components/analytics/RivalIntelTab";
import { EconomicIndicators } from "@/components/analytics/EconomicIndicators";
import { NpcAIStatusPanel } from "@/components/analytics/NpcAIStatusPanel";
import { useTabParam } from "@/hooks/ui/useTabParam";
import { BarChart3, Zap, DollarSign, Sprout, PawPrint, Swords } from "lucide-react";

const ANALYTICS_TABS = ["overview", "stable", "racing", "finance", "breeding", "rivals"] as const;

export const Route = createFileRoute("/analytics/")({
  validateSearch: z.object({
    tab: z.enum(ANALYTICS_TABS).optional(),
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { tab, setTab } = useTabParam("overview", ANALYTICS_TABS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Analytics
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Stable performance metrics and trends
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof ANALYTICS_TABS)[number])}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="stable" className="gap-2">
            <PawPrint className="h-4 w-4" />
            Stable
          </TabsTrigger>
          <TabsTrigger value="racing" className="gap-2">
            <Zap className="h-4 w-4" />
            Racing
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="breeding" className="gap-2">
            <Sprout className="h-4 w-4" />
            Breeding
          </TabsTrigger>
          <TabsTrigger value="rivals" className="gap-2">
            <Swords className="h-4 w-4" />
            Rivals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <EconomicIndicators />
          <NpcAIStatusPanel />
          <AnalyticsOverviewTab />
        </TabsContent>

        <TabsContent value="stable" className="space-y-4">
          <AnalyticsStableTab />
        </TabsContent>

        <TabsContent value="racing" className="space-y-4">
          <AnalyticsRacingTab />
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <AnalyticsFinanceTab />
        </TabsContent>

        <TabsContent value="breeding" className="space-y-4">
          <AnalyticsBreedingTab />
        </TabsContent>

        <TabsContent value="rivals" className="space-y-4">
          <RivalIntelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
