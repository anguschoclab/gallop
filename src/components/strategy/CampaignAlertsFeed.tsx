import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  HeartPulse,
  BatteryLow,
  CalendarX,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import type { CampaignFlag } from "@/services/calendar/calendarFacade";

interface CampaignAlertsFeedProps {
  flags?: CampaignFlag[];
  onDismissFlag?: (index: number) => void;
  onNavigateToCalendar?: () => void;
}

export function CampaignAlertsFeed({
  flags = [],
  onDismissFlag,
  onNavigateToCalendar,
}: CampaignAlertsFeedProps) {
  const activeFlags = flags
    .map((flag, originalIndex) => ({ flag, originalIndex }))
    .filter(({ flag }) => !flag.dismissed);

  const getFlagMeta = (type: CampaignFlag["type"]) => {
    switch (type) {
      case "field_full":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          title: "Field Full / Bumped",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "health_issue":
        return {
          icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
          title: "Health & Injury",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "low_energy":
        return {
          icon: <BatteryLow className="w-4 h-4 text-amber-400" />,
          title: "Fatigue & Low Energy",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "poor_form":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          title: "Poor Form",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "class_mismatch":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-purple-400" />,
          title: "Class Mismatch",
          badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "upgrade_available":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          title: "Upgrade Available",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "trait_confirmed":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
          title: "Trait Confirmed",
          badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
      default:
        return {
          icon: <CalendarX className="w-4 h-4 text-blue-400" />,
          title: "Campaign Notice",
          badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
    }
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <CardTitle className="text-base font-semibold">Campaign Alerts & Feed</CardTitle>
              <p className="text-xs text-muted-foreground">
                Automated Notifications: Field Rejections, Injury Interruptions & Schedule Drift
              </p>
            </div>
          </div>

          <Badge
            variant={activeFlags.length > 0 ? "destructive" : "outline"}
            className="text-xs font-mono"
          >
            {activeFlags.length} Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {activeFlags.length === 0 ? (
          <div className="flex items-center gap-3 py-4 px-3 bg-muted/20 border border-border/40 rounded-lg text-sm text-muted-foreground">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-medium text-foreground">Campaign is on track!</span>
              <p className="text-xs text-muted-foreground">
                No active bump flags, injuries, or schedule conflicts reported.
              </p>
            </div>
          </div>
        ) : (
          activeFlags.map(({ flag, originalIndex }) => {
            const meta = getFlagMeta(flag.type);

            return (
              <div
                key={`${flag.day}-${flag.type}-${originalIndex}`}
                className="border rounded-lg p-3 bg-muted/20 border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{meta.icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0 ${meta.badgeClass}`}
                      >
                        {meta.title}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Day {flag.day}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{flag.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onNavigateToCalendar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNavigateToCalendar}
                      className="text-xs text-primary hover:text-primary gap-1"
                    >
                      <span>Find Race</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  {onDismissFlag && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDismissFlag(originalIndex)}
                      className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
