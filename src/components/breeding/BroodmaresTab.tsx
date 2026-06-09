import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, FileText } from "lucide-react";
import { PregnancyTimeline } from "@/components/breeding/PregnancyTimeline";
import type { useBreedingPage } from "@/hooks/useBreedingPage";

interface BroodmaresTabProps {
  pageData: ReturnType<typeof useBreedingPage>;
}

export function BroodmaresTab({ pageData }: BroodmaresTabProps) {
  const { activePregnancies, activePregnanciesCount, day, log } = pageData;

  if (activePregnanciesCount === 0) {
    return (
      <Card className="border-gold-muted">
        <CardContent className="p-12 text-center">
          <Baby className="h-12 w-12 mx-auto text-cream-muted mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">No active pregnancies</h3>
          <p className="text-sm text-cream-muted">
            Mate your horses in the Breeding Shed to begin bloodstock development.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {activePregnancies.map((p: any) => {
        const daysRemaining = p.dueDay - day - 1;
        return (
          <Card key={p.id} className="border-l-4 border-l-gold border-gold-muted">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                    {p.damName} × {p.sireName}
                  </CardTitle>
                  <p className="text-xs text-cream-muted mt-1 tabular-nums">
                    Conceived Day {p.conceivedDay} · Due Day {p.dueDay}
                  </p>
                </div>
                <Badge
                  variant={daysRemaining <= 7 ? "default" : "secondary"}
                  className="tabular-nums"
                >
                  {daysRemaining <= 0 ? "Due Now" : `${daysRemaining} days`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PregnancyTimeline
                conceivedDay={p.conceivedDay}
                dueDay={p.dueDay}
                currentDay={day}
                sireName={p.sireName}
                damName={p.damName}
              />
              <div className="flex justify-between items-center pt-2 border-t text-xs">
                <div className="flex gap-2">
                  <Link to="/stable/$horseId" params={{ horseId: p.damId }}>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]">
                      Dam Profile
                    </Button>
                  </Link>
                  <Link to="/stable/$horseId" params={{ horseId: p.sireId }}>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]">
                      Sire Profile
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  {(p.reBreedingAttempts ?? 0) > 0 && (
                    <span className="text-warning font-medium tabular-nums">
                      Re-breeding attempt {p.reBreedingAttempts}/3
                    </span>
                  )}
                  {p.liveFoalGuarantee && (
                    <span className="text-success font-medium">Live Foal Guarantee</span>
                  )}
                  {(() => {
                    const maternityLog = log.filter(
                      (l: any) =>
                        l.text.includes(p.damName) &&
                        (l.text.includes("Mated") || l.text.includes("Foal")),
                    );
                    return (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-cream-muted hover:text-cream"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Log ({maternityLog.length})
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
