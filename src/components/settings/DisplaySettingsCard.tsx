import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Monitor } from "lucide-react";

interface DisplaySettings {
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
            checked={settings?.compactMode ?? false}
            onCheckedChange={(checked) => onUpdate({ compactMode: checked })}
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
            checked={settings?.animationsEnabled ?? true}
            onCheckedChange={(checked) => onUpdate({ animationsEnabled: checked })}
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
            checked={settings?.detailedTooltips ?? true}
            onCheckedChange={(checked) => onUpdate({ detailedTooltips: checked })}
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
            checked={settings?.highlightPendingActions ?? true}
            onCheckedChange={(checked) => onUpdate({ highlightPendingActions: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
