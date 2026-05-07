import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PregnancyTimeline } from "@/components/PregnancyTimeline";
import { FileText, Heart } from "lucide-react";

export const Route = createFileRoute("/broodmares")({
  component: BroodmaresPage,
});

function BroodmaresPage() {
  const horses = useGame((s) => s.horses);
  const pregnancies = useGame((s) => s.pregnancies);
  const day = useGame((s) => s.day);
  const log = useGame((s) => s.log);

  // Get all active pregnancies (unresolved)
  const activePregnancies = pregnancies.filter((p) => !p.resolved);

  // Group pregnancies by dam to show each broodmare once
  const broodmareData = activePregnancies
    .map((pregnancy) => {
      const dam = horses.find((h) => h.id === pregnancy.damId);
      const sire = horses.find((h) => h.id === pregnancy.sireId);
      const daysRemaining = pregnancy.dueDay - day;

      // Get maternity log entries for this dam
      const maternityLog = log.filter(
        (l) =>
          l.text.includes(pregnancy.damName) &&
          (l.text.includes("Mated") || l.text.includes("Foal")),
      );

      return {
        pregnancy,
        dam,
        sire,
        daysRemaining,
        maternityLog,
      };
    })
    .filter((data) => data.dam); // Only include if dam still exists

  // Sort by days remaining (soonest due first)
  const sortedBroodmares = broodmareData.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Broodmare Management
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          {sortedBroodmares.length} pregnant mare{sortedBroodmares.length !== 1 ? "s" : ""}
        </p>
      </div>

      {sortedBroodmares.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-cream-muted mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pregnant mares</h3>
            <p className="text-sm text-cream-muted mb-4">
              Visit the Breeding Shed to mate your horses and start building your broodmare band.
            </p>
            <Link to="/breeding">
              <Button>Go to Breeding</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedBroodmares.map(({ pregnancy, dam, sire, daysRemaining, maternityLog }) => (
            <Card key={pregnancy.id} className="border-l-4 border-l-gold border-gold-muted">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                        {dam?.name}
                      </CardTitle>
                      <Badge className="bg-t700 text-cream">Age {dam?.age}</Badge>
                      {daysRemaining <= 0 && (
                        <Badge variant="default" className="bg-destructive">
                          Due Now
                        </Badge>
                      )}
                      {dam?.blueHenStatus?.isBlueHen && (
                        <Badge variant="outline" className="border-info text-info">
                          Blue Hen
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-cream-muted">
                      Bred to {pregnancy.sireName} · Conceived Day {pregnancy.conceivedDay}
                    </p>
                    {dam?.blueHenStatus && (
                      <p className="text-xs text-cream-muted mt-1">
                        {dam.blueHenStatus.stakesWinnersProduced} stakes winners ·{" "}
                        {dam.blueHenStatus.group1WinnersProduced} G1 winners · Score:{" "}
                        {dam.blueHenStatus.blueHenScore}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        daysRemaining <= 5
                          ? "default"
                          : daysRemaining <= 15
                            ? "secondary"
                            : "outline"
                      }
                      className={daysRemaining <= 5 ? "bg-warning" : ""}
                    >
                      {daysRemaining <= 0 ? "Due" : `${daysRemaining} days`}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <PregnancyTimeline
                  conceivedDay={pregnancy.conceivedDay}
                  dueDay={pregnancy.dueDay}
                  currentDay={day}
                  sireName={pregnancy.sireName}
                  damName={pregnancy.damName}
                />

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-2">
                    <Link to="/stable/$horseId" params={{ horseId: dam?.id || "" }}>
                      <Button size="sm" variant="outline">
                        <Heart className="h-4 w-4 mr-1" />
                        View Mare
                      </Button>
                    </Link>
                    {sire && (
                      <Link to="/stable/$horseId" params={{ horseId: sire.id }}>
                        <Button size="sm" variant="outline">
                          <Heart className="h-4 w-4 mr-1" />
                          View Sire
                        </Button>
                      </Link>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-cream-muted">
                    <FileText className="h-4 w-4 mr-1" />
                    Maternity Log ({maternityLog.length})
                  </Button>
                </div>

                {maternityLog.length > 0 && (
                  <div className="mt-3 p-3 bg-t700 rounded-md border border-gold-muted">
                    <p className="text-xs font-medium text-cream-muted mb-2">
                      Recent maternity activity:
                    </p>
                    <div className="space-y-1">
                      {maternityLog.slice(0, 3).map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-xs py-1 border-b border-gold-muted last:border-0 flex gap-2"
                        >
                          <span className="text-cream-muted tabular-nums shrink-0">
                            D{entry.day}
                          </span>
                          <span className="text-cream">{entry.text}</span>
                        </div>
                      ))}
                      {maternityLog.length > 3 && (
                        <p className="text-xs text-cream-muted">
                          +{maternityLog.length - 3} more entries
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
