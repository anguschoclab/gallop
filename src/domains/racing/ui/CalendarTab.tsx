import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ChevronRight } from "lucide-react";
import { REGION_LIST } from "@/domains/calendar/application/calendarFacade";

export function CalendarTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
          Regional Racing Calendars
        </h2>
        <p className="text-muted-foreground font-[family-name:var(--font-body)]">
          Browse graded stakes races by region
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REGION_LIST.map((region) => (
          <Link key={region.id} to="/calendar/$regionId" params={{ regionId: region.id }}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground font-[family-name:var(--font-display)]">
                  {region.name}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{region.subtitle}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border text-foreground">
                    {region.tracks.length} tracks
                  </Badge>
                  {region.specialFilterName && (
                    <Badge className="bg-muted text-foreground">{region.specialFilterName}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
