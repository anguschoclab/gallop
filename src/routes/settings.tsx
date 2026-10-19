import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import { Settings, RotateCcw } from "lucide-react";
import { useUserSettings, useSettingsActions } from "@/platform/game/hooks/useSystemsState";
import { useState } from "react";
import { SaveLoadDialog } from "@/domains/settings/ui/SaveLoadDialog";
import { DisplaySettingsCard } from "@/domains/settings/ui/DisplaySettingsCard";
import { GameplaySettingsCard } from "@/domains/settings/ui/GameplaySettingsCard";
import { NotificationSettingsCard } from "@/domains/settings/ui/NotificationSettingsCard";
import { AudioSettingsCard } from "@/domains/settings/ui/AudioSettingsCard";
import { DataManagementCard } from "@/domains/settings/ui/DataManagementCard";
import { RealWorldDataCard } from "@/domains/settings/ui/RealWorldDataCard";
import { GlossaryPanel } from "@/domains/settings/ui/GlossaryPanel";
import { TutorialSettingsCard } from "@/domains/settings/ui/TutorialSettingsCard";
import { StableIdentityCard } from "@/domains/settings/ui/StableIdentityCard";

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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground font-[family-name:var(--font-display)]">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
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
        <RealWorldDataCard />
        <DataManagementCard
          lastModifiedDay={userSettings?.lastModified}
          version={undefined}
          onSave={() => {
            setSaveDialogTab("save");
            setSaveDialogOpen(true);
          }}
          onLoad={() => {
            setSaveDialogTab("load");
            setSaveDialogOpen(true);
          }}
        />
        <GlossaryPanel />
        <TutorialSettingsCard />
        <StableIdentityCard />
      </div>

      <SaveLoadDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        initialTab={saveDialogTab}
      />
    </div>
  );
}
