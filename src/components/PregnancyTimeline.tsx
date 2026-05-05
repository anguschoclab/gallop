import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PregnancyTimelineProps {
  conceivedDay: number;
  dueDay: number;
  currentDay: number;
  sireName: string;
  damName: string;
}

export function PregnancyTimeline({
  conceivedDay,
  dueDay,
  currentDay,
  sireName,
  damName,
}: PregnancyTimelineProps) {
  const totalDays = dueDay - conceivedDay;
  const daysElapsed = currentDay - conceivedDay;
  const daysRemaining = dueDay - currentDay;
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  // Generate day markers for the timeline
  const dayMarkers = Array.from({ length: totalDays + 1 }, (_, i) => i);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with parent names and countdown */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">
                {sireName} × {damName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Conceived Day {conceivedDay} → Due Day {dueDay}
              </p>
            </div>
            <Badge variant={daysRemaining <= 0 ? "default" : "secondary"}>
              {daysRemaining <= 0 ? "Due" : `${daysRemaining} days remaining`}
            </Badge>
          </div>

          {/* Visual timeline */}
          <div className="relative">
            {/* Timeline bar */}
            <div className="h-8 bg-muted rounded-lg overflow-hidden relative">
              {/* Progress fill */}
              <div
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
              
              {/* Day markers */}
              <div className="absolute inset-0 flex items-center">
                {dayMarkers.map((dayOffset) => {
                  const dayNumber = conceivedDay + dayOffset;
                  const isConceived = dayOffset === 0;
                  const isDue = dayOffset === totalDays;
                  const isCurrent = dayNumber === currentDay;
                  const isPast = dayNumber < currentDay;
                  const isFuture = dayNumber > currentDay;

                  return (
                    <div
                      key={dayOffset}
                      className="flex-1 flex flex-col items-center justify-center"
                      title={`Day ${dayNumber}`}
                    >
                      {/* Marker dot */}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isConceived
                            ? "bg-success ring-2 ring-success/50"
                            : isDue
                            ? "bg-destructive ring-2 ring-destructive/50"
                            : isCurrent
                            ? "bg-white ring-2 ring-white/50"
                            : isPast
                            ? "bg-primary/60"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline labels */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-green-600">Conceived</span>
              <span className="font-medium">Progress: {Math.round(progress)}%</span>
              <span className="font-medium text-red-600">Due</span>
            </div>
          </div>

          {/* Current status indicator */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Day {currentDay} of {totalDays} day gestation
            </span>
            <span className="text-muted-foreground">
              {daysElapsed} days elapsed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
