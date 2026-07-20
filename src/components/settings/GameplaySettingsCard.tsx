import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Gamepad2 } from "lucide-react";

interface GameplaySettings {
  autoSimEnabled?: boolean;
  suggestRaceEntries?: boolean;
  showDailyEarnings?: boolean;
  pauseOnEvents?: boolean;
  parentNameBlendingEnabled?: boolean;
  imminentForcedSaleWarningDays?: number;
}

interface GameplaySettingsCardProps {
  settings: GameplaySettings;
  onUpdate: (patch: Partial<GameplaySettings>) => void;
}

export function GameplaySettingsCard({ settings, onUpdate }: GameplaySettingsCardProps) {
  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
          <Gamepad2 className="h-4 w-4" />
          Gameplay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sim">Auto-Simulation</Label>
            <p className="text-xs text-cream-muted">Auto-advance when no player races</p>
          </div>
          <Switch
            id="auto-sim"
            checked={settings?.autoSimEnabled ?? true}
            onCheckedChange={(checked) => onUpdate({ autoSimEnabled: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="suggest-entries">Race Entry Suggestions</Label>
            <p className="text-xs text-cream-muted">Auto-suggest eligible horses for races</p>
          </div>
          <Switch
            id="suggest-entries"
            checked={settings?.suggestRaceEntries ?? true}
            onCheckedChange={(checked) => onUpdate({ suggestRaceEntries: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-earnings">Daily Earnings Summary</Label>
            <p className="text-xs text-cream-muted">Show summary after each race day</p>
          </div>
          <Switch
            id="daily-earnings"
            checked={settings?.showDailyEarnings ?? true}
            onCheckedChange={(checked) => onUpdate({ showDailyEarnings: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="pause-events">Pause on Events</Label>
            <p className="text-xs text-cream-muted">Stop for awards and major races</p>
          </div>
          <Switch
            id="pause-events"
            checked={settings?.pauseOnEvents ?? true}
            onCheckedChange={(checked) => onUpdate({ pauseOnEvents: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="parent-name-blending">Parent Name Blending</Label>
            <p className="text-xs text-cream-muted">Blend parent names for foals when breeding</p>
          </div>
          <Switch
            id="parent-name-blending"
            checked={settings?.parentNameBlendingEnabled ?? true}
            onCheckedChange={(checked) => onUpdate({ parentNameBlendingEnabled: checked })}
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="space-y-0.5">
            <Label htmlFor="imminent-warning">Imminent Forced Sale Warning</Label>
            <p className="text-xs text-cream-muted">Days before forced sale to show the alert</p>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              id="imminent-warning"
              min={1}
              max={5}
              step={1}
              value={[settings?.imminentForcedSaleWarningDays ?? 2]}
              onValueChange={(value) => onUpdate({ imminentForcedSaleWarningDays: value[0] })}
              className="flex-1"
            />
            <span className="text-sm text-cream-muted font-mono tabular-nums w-16 text-right">
              {settings?.imminentForcedSaleWarningDays ?? 2} day{((settings?.imminentForcedSaleWarningDays ?? 2) === 1 ? "" : "s")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
