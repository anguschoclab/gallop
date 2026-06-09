import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Database, Save, FolderOpen } from "lucide-react";

interface DataManagementCardProps {
  lastModifiedDay?: number;
  version?: number;
  onSave: () => void;
  onLoad: () => void;
}

export function DataManagementCard({ lastModifiedDay, version, onSave, onLoad }: DataManagementCardProps) {
  return (
    <Card className="md:col-span-2 border-gold-muted bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
          <Database className="h-4 w-4" />
          Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-gold-muted text-gold hover:bg-gold/10 font-bold"
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            Manual Save
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 font-bold"
            onClick={onLoad}
          >
            <FolderOpen className="h-4 w-4" />
            Load Game
          </Button>
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Continuous Persistence</Label>
            <p className="text-xs text-cream-muted">
              Your live progress is automatically saved to browser storage after every action.
            </p>
          </div>
          <Badge variant="outline" className="text-success border-success/30 bg-success/10">
            Enabled
          </Badge>
        </div>

        <div className="text-xs text-cream-muted bg-slate-800/30 p-3 rounded border border-slate-700/50">
          <p>Settings last modified: Day {lastModifiedDay ?? 1}</p>
          <p className="mt-1">Settings version: {version ?? 1}</p>
        </div>
      </CardContent>
    </Card>
  );
}
