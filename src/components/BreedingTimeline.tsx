import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Baby, Heart } from "lucide-react";

interface BreedingTimelineProps {
  horseId: string;
}

export function BreedingTimeline({ horseId }: BreedingTimelineProps) {
  const horses = useGame((s) => s.horses);
  const pregnancies = useGame((s) => s.pregnancies);
  const day = useGame((s) => s.day);

  // Find all pregnancies where this horse is either sire or dam
  const relatedPregnancies = pregnancies.filter((p) => p.sireId === horseId || p.damId === horseId);

  // Find the pregnancy that produced this horse (if it was born in-game)
  const birthPregnancy = pregnancies.find((p) => p.foalId === horseId);

  // Build timeline events
  const events: Array<{
    type: "birth" | "conception" | "foal_birth";
    day: number;
    title: string;
    description: string;
    badgeVariant: "default" | "secondary" | "outline";
  }> = [];

  // Add birth event if this horse was born in-game
  if (birthPregnancy) {
    events.push({
      type: "birth",
      day: birthPregnancy.dueDay,
      title: "Born",
      description: `By ${birthPregnancy.sireName} out of ${birthPregnancy.damName}`,
      badgeVariant: "default",
    });
  }

  // Create a map for O(1) horse lookups
  const horseMap = new Map(horses.map((h) => [h.id, h]));

  // Add conception events where this horse was sire or dam
  relatedPregnancies.forEach((p) => {
    const isSire = p.sireId === horseId;
    const partnerName = isSire ? p.damName : p.sireName;
    const partnerHorse = horseMap.get(isSire ? p.damId : p.sireId);

    events.push({
      type: "conception",
      day: p.conceivedDay,
      title: isSire ? "Bred as sire" : "Bred as dam",
      description: `With ${partnerName}${partnerHorse ? ` (${partnerHorse.age}YO ${partnerHorse.gender === "colt" || partnerHorse.gender === "horse" ? "colt" : "filly"})` : ""}`,
      badgeVariant: "secondary",
    });

    // Add foal birth event if pregnancy is resolved
    if (p.resolved && p.foalId) {
      const foal = horseMap.get(p.foalId);
      if (foal) {
        events.push({
          type: "foal_birth",
          day: p.dueDay,
          title: "Foal born",
          description: `${foal.name} (${foal.gender}, ${foal.temperament || "unknown temperament"})`,
          badgeVariant: "outline",
        });
      }
    }
  });

  // Sort events by day (most recent first)
  events.sort((a, b) => b.day - a.day);

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Breeding History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No breeding history recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breeding History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="relative pl-8 pb-4 last:pb-0">
              {/* Timeline line */}
              {index !== events.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
              )}

              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                {event.type === "birth" && <Baby className="h-3 w-3 text-primary" />}
                {event.type === "conception" && <Heart className="h-3 w-3 text-fame" />}
                {event.type === "foal_birth" && <Calendar className="h-3 w-3 text-success" />}
              </div>

              {/* Event content */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{event.title}</span>
                  <Badge variant={event.badgeVariant} className="text-xs">
                    Day {event.day}
                  </Badge>
                  {event.day > day && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Future
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
