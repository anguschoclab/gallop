import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from "lucide-react";
import { useUserSettings, useSettingsActions } from "@/hooks/game/useSystemsState";
import { useState } from "react";
import { SaveLoadDialog } from "@/components/settings/SaveLoadDialog";
import { DisplaySettingsCard } from "@/components/settings/DisplaySettingsCard";
import { GameplaySettingsCard } from "@/components/settings/GameplaySettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { AudioSettingsCard } from "@/components/settings/AudioSettingsCard";
import { DataManagementCard } from "@/components/settings/DataManagementCard";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogTab, setSaveDialogTab] = useState<"save" | "load">("save");

  const userSettings = useUserSettings();
  const {
    updateDisplaySettings,
    updateGameplaySettings,
    updateNotificationSettings,
    updateAudioSettings,
    resetSettings,
  } = useSettingsActions();

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
        <DisplaySettingsCard settings={display ?? {}} onUpdate={updateDisplaySettings} />
        <GameplaySettingsCard settings={gameplay ?? {}} onUpdate={updateGameplaySettings} />
        <NotificationSettingsCard
          settings={notifications ?? {}}
          onUpdate={updateNotificationSettings}
        />
        <AudioSettingsCard settings={audio ?? {}} onUpdate={updateAudioSettings} />
        <DataManagementCard
          lastModifiedDay={userSettings?.lastModified}
          version={(userSettings as any)?.version}
          onSave={() => {
            setSaveDialogTab("save");
            setSaveDialogOpen(true);
          }}
          onLoad={() => {
            setSaveDialogTab("load");
            setSaveDialogOpen(true);
          }}
        />
      </div>

      <SaveLoadDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        initialTab={saveDialogTab}
      />
    </div>
  );
}
