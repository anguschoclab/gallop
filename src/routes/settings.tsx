import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Volume2, Monitor, Database, Bell, Gamepad2, RotateCcw } from "lucide-react";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  // Use shallow comparison to prevent unnecessary re-renders
  const {
    userSettings,
    updateDisplaySettings,
    updateGameplaySettings,
    updateNotificationSettings,
    updateAudioSettings,
    resetSettings,
  } = useGame(
    (state) => ({
      userSettings: state.userSettings,
      updateDisplaySettings: state.updateDisplaySettings,
      updateGameplaySettings: state.updateGameplaySettings,
      updateNotificationSettings: state.updateNotificationSettings,
      updateAudioSettings: state.updateAudioSettings,
      resetSettings: state.resetSettings,
    }),
    shallow
  );

  const display = userSettings?.display;
  const gameplay = userSettings?.gameplay;
  const notifications = userSettings?.notifications;
  const audio = userSettings?.audio;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-cream-muted mt-1 font-[family-name:var(--font-body)]">
            Configure your stable manager preferences
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetSettings} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Display Settings */}
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
              <Monitor className="h-4 w-4" />
              Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-xs text-cream-muted">Smaller cards and tighter spacing</p>
              </div>
              <Switch
                id="compact-mode"
                checked={display?.compactMode ?? false}
                onCheckedChange={(checked) => updateDisplaySettings({ compactMode: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations">Animations</Label>
                <p className="text-xs text-cream-muted">UI transitions and race viewer effects</p>
              </div>
              <Switch
                id="animations"
                checked={display?.animationsEnabled ?? true}
                onCheckedChange={(checked) => updateDisplaySettings({ animationsEnabled: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="detailed-tooltips">Detailed Tooltips</Label>
                <p className="text-xs text-cream-muted">Full stat breakdowns on hover</p>
              </div>
              <Switch
                id="detailed-tooltips"
                checked={display?.detailedTooltips ?? true}
                onCheckedChange={(checked) => updateDisplaySettings({ detailedTooltips: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="highlight-pending">Highlight Pending Actions</Label>
                <p className="text-xs text-cream-muted">Emphasize horses needing attention</p>
              </div>
              <Switch
                id="highlight-pending"
                checked={display?.highlightPendingActions ?? true}
                onCheckedChange={(checked) => updateDisplaySettings({ highlightPendingActions: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gameplay Settings */}
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
                checked={gameplay?.autoSimEnabled ?? true}
                onCheckedChange={(checked) => updateGameplaySettings({ autoSimEnabled: checked })}
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
                checked={gameplay?.suggestRaceEntries ?? true}
                onCheckedChange={(checked) => updateGameplaySettings({ suggestRaceEntries: checked })}
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
                checked={gameplay?.showDailyEarnings ?? true}
                onCheckedChange={(checked) => updateGameplaySettings({ showDailyEarnings: checked })}
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
                checked={gameplay?.pauseOnEvents ?? true}
                onCheckedChange={(checked) => updateGameplaySettings({ pauseOnEvents: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
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
                checked={notifications?.raceResults ?? true}
                onCheckedChange={(checked) => updateNotificationSettings({ raceResults: checked })}
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
                checked={notifications?.auctionEvents ?? true}
                onCheckedChange={(checked) => updateNotificationSettings({ auctionEvents: checked })}
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
                checked={notifications?.breedingEvents ?? true}
                onCheckedChange={(checked) => updateNotificationSettings({ breedingEvents: checked })}
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
                checked={notifications?.healthAlerts ?? true}
                onCheckedChange={(checked) => updateNotificationSettings({ healthAlerts: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Audio Settings */}
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
              <Volume2 className="h-4 w-4" />
              Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-effects">Sound Effects</Label>
                <p className="text-xs text-cream-muted">UI sounds and game events</p>
              </div>
              <Switch
                id="sound-effects"
                checked={audio?.soundEffects ?? false}
                onCheckedChange={(checked) => updateAudioSettings({ soundEffects: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="race-ambience">Race Ambience</Label>
                <p className="text-xs text-cream-muted">Crowd and track atmosphere</p>
              </div>
              <Switch
                id="race-ambience"
                checked={audio?.raceAmbience ?? false}
                onCheckedChange={(checked) => updateAudioSettings({ raceAmbience: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ui-sounds">UI Click Sounds</Label>
                <p className="text-xs text-cream-muted">Button and interaction sounds</p>
              </div>
              <Switch
                id="ui-sounds"
                checked={audio?.uiSounds ?? false}
                onCheckedChange={(checked) => updateAudioSettings({ uiSounds: checked })}
              />
            </div>
            <div className="pt-2">
              <p className="text-xs text-cream-muted italic">
                Master volume and audio implementation coming in a future update.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="md:col-span-2 border-gold-muted">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
              <Database className="h-4 w-4" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Save Status</Label>
                <p className="text-xs text-cream-muted">
                  Game data is automatically saved to your browser's storage
                </p>
              </div>
              <Badge variant="outline" className="text-success border-gold-muted">Auto-save enabled</Badge>
            </div>
            <Separator />
            <div className="text-xs text-cream-muted">
              <p>Settings last modified: Day {userSettings?.lastModified ?? 1}</p>
              <p className="mt-1">Settings version: {userSettings?.version ?? 1}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
