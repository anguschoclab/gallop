import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";

interface NotificationSettings {
  raceResults?: boolean;
  auctionEvents?: boolean;
  breedingEvents?: boolean;
  healthAlerts?: boolean;
}

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onUpdate: (patch: Partial<NotificationSettings>) => void;
}

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
      </CardContent>
    </Card>
  );
}
