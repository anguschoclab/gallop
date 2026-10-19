import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FileText } from "lucide-react";
import React from "react";
import type { SaveSlotMetadata } from "@/platform/persistence/storage/saveManager";
import type { LedgerEntryProps } from "@/domains/settings/ui/LedgerEntry";

interface SaveTabProps {
  newSaveName: string;
  onNameChange: (value: string) => void;
  onCreate: () => void;
  isSaving: boolean;
  saves: SaveSlotMetadata[];
  onOverwrite: (id: string, name: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  LedgerEntryComponent: React.ComponentType<LedgerEntryProps>;
}

export function SaveTab({
  newSaveName,
  onNameChange,
  onCreate,
  isSaving,
  saves,
  onOverwrite,
  onDelete,
  LedgerEntryComponent,
}: SaveTabProps) {
  const inputId = React.useId();

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-900/40 border border-primary/20 flex gap-4 items-center">
        <div className="h-10 w-10 shrink-0 bg-primary/10 flex items-center justify-center border border-primary/30">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <label
            htmlFor={inputId}
            className="text-[10px] uppercase font-mono text-primary/60 tracking-tighter"
          >
            Entry Label
          </label>
          <Input
            id={inputId}
            placeholder="Save name..."
            value={newSaveName}
            onChange={(e) => onNameChange(e.target.value.toUpperCase())}
            className="bg-transparent border-none p-0 h-auto text-foreground font-mono placeholder:text-slate-700 focus-visible:ring-0 text-lg uppercase"
          />
        </div>
        <Button
          onClick={onCreate}
          disabled={isSaving}
          className="bg-primary hover:bg-accent-bright text-slate-950 font-bold uppercase tracking-tighter h-12 rounded-none px-6"
        >
          Create Snapshot
        </Button>
      </div>

      <div className="space-y-4">
        <div className="text-[10px] uppercase font-mono text-primary/40 border-b border-primary/10 pb-1">
          Previous Snapshots
        </div>
        {saves
          .filter((s) => !s.isAutoSave)
          .map((save) => (
            <LedgerEntryComponent
              key={save.id}
              save={save}
              onAction={() => onOverwrite(save.id, save.name)}
              onDelete={(e: React.MouseEvent) => onDelete(save.id, e)}
              actionLabel="Save"
            />
          ))}
      </div>
    </div>
  );
}
