import { createFileRoute } from "@tanstack/react-router";
import { JockeyRoster } from "@/domains/jockey/ui/JockeyRoster";
import { JockeyStandingsTable } from "@/domains/jockey/ui/JockeyStandingsTable";
import { ApprenticeTracker } from "@/domains/apprentice/ui/ApprenticeTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useGameWithShallow } from "@/platform/game/store";

export const Route = createFileRoute("/jockeys")({
  component: JockeysPage,
});

function JockeysPage() {
  const jockeys = useGameWithShallow((s) => s.jockeys);

  return (
    <div className="p-6 space-y-6">
      <ApprenticeTracker />
      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>
        <TabsContent value="roster">
          <JockeyRoster />
        </TabsContent>
        <TabsContent value="standings">
          <JockeyStandingsTable jockeys={jockeys ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
