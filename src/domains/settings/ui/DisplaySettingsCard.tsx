import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Monitor } from "lucide-react";
import type { ThemePreference } from "@/domains/shell/application/hooks/useTheme";

interface DisplaySettings {
  theme?: ThemePreference;
  compactMode?: boolean;
  animationsEnabled?: boolean;
  detailedTooltips?: boolean;
  highlightPendingActions?: boolean;
}

interface DisplaySettingsCardProps {
  settings: DisplaySettings;
  onUpdate: (patch: Partial<DisplaySettings>) => void;
}

export function DisplaySettingsCard({ settings, onUpdate }: DisplaySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-foreground font-[family-name:var(--font-display)]">
          <Monitor className="h-4 w-4" />
          Display
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="theme">Theme</Label>
            <p className="text-xs text-muted-foreground">Racing noir, light, or follow your OS</p>
          </div>
          <Select
            value={settings?.theme ?? "dark"}
            onValueChange={(value) => onUpdate({ theme: value as ThemePreference })}
          >
            <SelectTrigger id="theme" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="compact-mode">Compact Mode</Label>
            <p className="text-xs text-muted-foreground">Smaller cards and tighter spacing</p>
          </div>
          <Switch
            id="compact-mode"
            checked={settings?.compactMode ?? false}
            onCheckedChange={(checked) => onUpdate({ compactMode: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="animations">Animations</Label>
            <p className="text-xs text-muted-foreground">UI transitions and race viewer effects</p>
          </div>
          <Switch
            id="animations"
            checked={settings?.animationsEnabled ?? true}
            onCheckedChange={(checked) => onUpdate({ animationsEnabled: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="detailed-tooltips">Detailed Tooltips</Label>
            <p className="text-xs text-muted-foreground">Full stat breakdowns on hover</p>
          </div>
          <Switch
            id="detailed-tooltips"
            checked={settings?.detailedTooltips ?? true}
            onCheckedChange={(checked) => onUpdate({ detailedTooltips: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="highlight-pending">Highlight Pending Actions</Label>
            <p className="text-xs text-muted-foreground">Emphasize horses needing attention</p>
          </div>
          <Switch
            id="highlight-pending"
            checked={settings?.highlightPendingActions ?? true}
            onCheckedChange={(checked) => onUpdate({ highlightPendingActions: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
