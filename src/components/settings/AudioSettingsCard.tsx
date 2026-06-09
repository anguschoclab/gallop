import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Volume2 } from "lucide-react";

interface AudioSettings {
  soundEffects?: boolean;
  raceAmbience?: boolean;
  uiSounds?: boolean;
}

interface AudioSettingsCardProps {
  settings: AudioSettings;
  onUpdate: (patch: Partial<AudioSettings>) => void;
}

export function AudioSettingsCard({ settings, onUpdate }: AudioSettingsCardProps) {
  return (
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
            checked={settings?.soundEffects ?? false}
            onCheckedChange={(checked) => onUpdate({ soundEffects: checked })}
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
            checked={settings?.raceAmbience ?? false}
            onCheckedChange={(checked) => onUpdate({ raceAmbience: checked })}
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
            checked={settings?.uiSounds ?? false}
            onCheckedChange={(checked) => onUpdate({ uiSounds: checked })}
          />
        </div>
        <div className="pt-2">
          <p className="text-xs text-cream-muted italic">
            Master volume and audio implementation coming in a future update.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
