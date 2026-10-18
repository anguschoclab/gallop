import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Bell } from "lucide-react";
import type { RivalMilestoneAlertSettings } from "@/domains/settings/model/settingsTypes";;

interface NotificationSettings {
  raceResults?: boolean;
  auctionEvents?: boolean;
  breedingEvents?: boolean;
  healthAlerts?: boolean;
  rivalMilestoneAlerts?: RivalMilestoneAlertSettings;
  playerMilestoneAlerts?: RivalMilestoneAlertSettings;
}

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onUpdate: (patch: Partial<NotificationSettings>) => void;
}

const MILESTONE_ALERT_ROWS: {
  key: keyof RivalMilestoneAlertSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "debut",
    label: "Racecourse debuts",
    description: "Notable rivals make their first career start",
  },
  {
    key: "breakthrough_win",
    label: "Graded breakthroughs",
    description: "A rival lands its first graded victory",
  },
  {
    key: "earnings",
    label: "Earnings milestones",
    description: "A rival passes a major earnings threshold",
  },
  {
    key: "peak_transition",
    label: "Peak-career transitions",
    description: "A rival enters or passes its peak years",
  },
  {
    key: "retirement",
    label: "Retirements",
    description: "A notable rival retires from racing",
  },
];

const PLAYER_MILESTONE_ALERT_ROWS: {
  key: keyof RivalMilestoneAlertSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "debut",
    label: "Racecourse debuts",
    description: "One of your horses makes its first career start",
  },
  {
    key: "breakthrough_win",
    label: "Graded breakthroughs",
    description: "Your horse lands its first graded victory",
  },
  {
    key: "earnings",
    label: "Earnings milestones",
    description: "Your horse passes a major earnings threshold",
  },
  {
    key: "peak_transition",
    label: "Peak-career transitions",
    description: "Your horse enters or passes its peak years",
  },
  {
    key: "retirement",
    label: "Retirements",
    description: "One of your horses retires from racing",
  },
];

export function NotificationSettingsCard({ settings, onUpdate }: NotificationSettingsCardProps) {
  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="race-results">Race Results</Label>
            <p className="text-xs text-cream-muted">Toast notifications for race outcomes</p>
          </div>
          <Switch
            id="race-results"
            checked={settings?.raceResults ?? true}
            onCheckedChange={(checked) => onUpdate({ raceResults: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auction-events">Auction Events</Label>
            <p className="text-xs text-cream-muted">Bidding and sale notifications</p>
          </div>
          <Switch
            id="auction-events"
            checked={settings?.auctionEvents ?? true}
            onCheckedChange={(checked) => onUpdate({ auctionEvents: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="breeding-events">Breeding Events</Label>
            <p className="text-xs text-cream-muted">Foaling and pregnancy updates</p>
          </div>
          <Switch
            id="breeding-events"
            checked={settings?.breedingEvents ?? true}
            onCheckedChange={(checked) => onUpdate({ breedingEvents: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="health-alerts">Health Alerts</Label>
            <p className="text-xs text-cream-muted">Injury and recovery notifications</p>
          </div>
          <Switch
            id="health-alerts"
            checked={settings?.healthAlerts ?? true}
            onCheckedChange={(checked) => onUpdate({ healthAlerts: checked })}
          />
        </div>
        <Separator />
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Rival Milestone Alerts</Label>
            <p className="text-xs text-cream-muted">
              Choose which rival-horse career milestones appear in your Message Center.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MILESTONE_ALERT_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor={`milestone-${row.key}`} className="text-xs">
                    {row.label}
                  </Label>
                  <p className="text-[10px] text-cream-muted">{row.description}</p>
                </div>
                <Switch
                  id={`milestone-${row.key}`}
                  checked={settings?.rivalMilestoneAlerts?.[row.key] ?? true}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      rivalMilestoneAlerts: {
                        debut: true,
                        breakthrough_win: true,
                        earnings: true,
                        peak_transition: true,
                        retirement: true,
                        ...settings?.rivalMilestoneAlerts,
                        [row.key]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Your Milestone Alerts</Label>
            <p className="text-xs text-cream-muted">
              Choose which of your own horses' career milestones appear in your Message Center.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLAYER_MILESTONE_ALERT_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor={`player-milestone-${row.key}`} className="text-xs">
                    {row.label}
                  </Label>
                  <p className="text-[10px] text-cream-muted">{row.description}</p>
                </div>
                <Switch
                  id={`player-milestone-${row.key}`}
                  checked={settings?.playerMilestoneAlerts?.[row.key] ?? true}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      playerMilestoneAlerts: {
                        debut: true,
                        breakthrough_win: true,
                        earnings: true,
                        peak_transition: true,
                        retirement: true,
                        ...settings?.playerMilestoneAlerts,
                        [row.key]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
