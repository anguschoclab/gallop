/**
 * SaveLoadDialog.tsx - "Stable Ledger" Industrial UI
 * Redesigned for thematic depth and high-craft utility.
 */

import { useState, useEffect } from "react";
import { useGame } from "@/game/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SaveTab } from "./SaveTab";
import { LoadTab } from "./LoadTab";
import {
  Database,
  ShieldCheck,
  ChevronRight,
  Trash2,
  Clock,
  HardDrive,
} from "lucide-react";
import { getSaveSlots, deleteSaveSlot, type SaveSlotMetadata } from "@/services/saveManager";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface SaveLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "save" | "load";
}

export function SaveLoadDialog({ open, onOpenChange, initialTab = "save" }: SaveLoadDialogProps) {
  const [activeTab, setActiveTab] = useState<"save" | "load">(initialTab);
  const [saves, setSaves] = useState<SaveSlotMetadata[]>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const manualSave = useGame((s) => s.manualSave);
  const loadSlot = useGame((s) => s.loadSlot);

  useEffect(() => {
    if (open) {
      refreshSaves();
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const refreshSaves = async () => {
    const data = await getSaveSlots();
    setSaves(data.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleManualSave = async (slotId?: string, existingName?: string) => {
    const id = slotId || `manual_${Date.now()}`;
    const name = existingName || newSaveName || `LEDGER_DAY_${useGame.getState().day}`;

    setIsSaving(true);
    try {
      await manualSave(id, name);
      setNewSaveName("");
      await refreshSaves();
    } catch (error) {
      console.error("Ledger write failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (slotId: string) => {
    if (
      !window.confirm("CONFIRM Load: Current live state will be overwritten by this ledger entry.")
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await loadSlot(slotId);
    } catch (error) {
      console.error("Recall failed:", error);
      setIsLoading(false);
    }
  };

  const handleDelete = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("CONFIRM PURGE: Permanent deletion of archive entry.")) {
      return;
    }

    await deleteSaveSlot(slotId);
    await refreshSaves();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-gold/30 p-0 overflow-hidden rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        <div className="relative border-b border-gold/20 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-sm font-bold">
                <Database className="h-4 w-4" />
                Stability Archive
              </div>
              <DialogTitle className="text-3xl font-[family-name:var(--font-display)] text-cream">
                Stable Ledgers
              </DialogTitle>
            </div>
            <div className="text-right font-mono text-[10px] text-gold/40 uppercase leading-tight">
              Vault Status: Secure
              <br />
              Auth: System Admin
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-6 py-2 bg-slate-900/30 border-b border-gold/10">
            <TabsList className="h-10 bg-transparent gap-8 p-0">
              <TabsTrigger
                value="save"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-gold text-cream-muted uppercase tracking-widest text-xs font-bold transition-all p-0 h-full"
              >
                Snapshot Current
              </TabsTrigger>
              <TabsTrigger
                value="load"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-gold text-cream-muted uppercase tracking-widest text-xs font-bold transition-all p-0 h-full"
              >
                Recall Entry
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar bg-black/20">
            <TabsContent value="save" className="mt-0">
              <SaveTab
                newSaveName={newSaveName}
                onNameChange={setNewSaveName}
                onCreate={() => handleManualSave()}
                isSaving={isSaving}
                saves={saves}
                onOverwrite={(id, name) => handleManualSave(id, name)}
                onDelete={handleDelete}
                LedgerEntryComponent={LedgerEntry}
              />
            </TabsContent>

            <TabsContent value="load" className="mt-0">
              <LoadTab
                saves={saves}
                onLoad={handleLoad}
                onDelete={handleDelete}
                isLoading={isLoading}
                LedgerEntryComponent={LedgerEntry}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-4 bg-slate-900/80 border-t border-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-mono text-success/60 uppercase">
            <ShieldCheck className="h-3 w-3" />
            Encryption: Active (AES-256)
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gold/60 hover:text-gold hover:bg-gold/5 font-mono text-xs uppercase tracking-widest"
          >
            Terminal.Close()
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LedgerEntry({
  save,
  onAction,
  onDelete,
  actionLabel,
  isLoading = false,
}: {
  save: SaveSlotMetadata;
  onAction: () => void;
  onDelete: (e: React.MouseEvent) => void;
  actionLabel: string;
  isLoading?: boolean;
}) {
  const isAuto = save.isAutoSave;

  return (
    <div
      className={cn(
        "group relative border transition-all cursor-pointer",
        isAuto
          ? "bg-blue-900/5 border-blue-500/20 hover:border-blue-500/40"
          : "bg-slate-900/20 border-white/5 hover:border-gold/30",
      )}
      onClick={onAction}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          isAuto ? "bg-blue-500/30 group-hover:bg-blue-400" : "bg-gold/10 group-hover:bg-gold",
        )}
      />

      <div className="p-4 pl-6 flex items-center justify-between">
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cream group-hover:text-gold transition-colors font-mono tracking-tight truncate">
                {save.name}
              </span>
              {isAuto && (
                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 border border-blue-500/30 font-mono font-bold">
                  AUTOSYNC
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(save.timestamp).toLocaleDateString()}{" "}
                {new Date(save.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="col-span-3 font-mono text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Timeline</div>
            <div className="text-cream group-hover:text-gold text-xs font-bold">
              DAY_{String(save.gameDay).padStart(4, "0")}
            </div>
          </div>

          <div className="col-span-4 font-mono text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Horses</div>
            <div className="text-success text-xs font-bold truncate">
              {formatCurrency(save.cash)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6 pl-6 border-l border-white/5">
          <button
            type="button"
            className="text-slate-600 hover:text-destructive transition-colors p-1"
            onClick={onDelete}
            title="Delete save"
            aria-label={`Delete save ${save.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 group/btn">
            <span
              className={cn(
                "text-[10px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100",
                actionLabel === "Load" ? "text-blue-400" : "text-gold",
              )}
            >
              {actionLabel}
            </span>
            <div
              className={cn(
                "h-8 w-8 flex items-center justify-center border rounded-full transition-all shrink-0",
                actionLabel === "Load"
                  ? "border-blue-500/40 text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-slate-950"
                  : "border-gold/40 text-gold group-hover/btn:bg-gold group-hover/btn:text-slate-950",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
