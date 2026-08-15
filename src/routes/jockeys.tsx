import { createFileRoute } from "@tanstack/react-router";
import { JockeyRoster } from "@/components/jockey/JockeyRoster";
import { JockeyStandingsTable } from "@/components/jockey/JockeyStandingsTable";
import { ApprenticeTracker } from "@/components/apprentice/ApprenticeTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameWithShallow } from "@/game/store";

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
