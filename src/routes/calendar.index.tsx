import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { REGION_LIST } from "@/core/calendar/regions";

export const Route = createFileRoute("/calendar/")({
  component: CalendarIndex,
});

function CalendarIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Regional Racing Calendars</h1>
        <p className="text-muted-foreground">Browse graded stakes races by region</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REGION_LIST.map((region) => (
          <Link key={region.id} to="/calendar/$regionId" params={{ regionId: region.id }}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {region.name}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{region.subtitle}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{region.tracks.length} tracks</Badge>
                  {region.specialFilterName && (
                    <Badge variant="secondary">{region.specialFilterName}</Badge>
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
