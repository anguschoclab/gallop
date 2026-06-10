/**
 * SaveLoadDialog.tsx - "Stable Ledger" Industrial UI
 * Redesigned for thematic depth and high-craft utility.
 */

import { useSaveSlots } from "@/hooks/useSaveSlots";
import { LedgerEntry } from "./LedgerEntry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SaveTab } from "./SaveTab";
import { LoadTab } from "./LoadTab";
import { Database, ShieldCheck } from "lucide-react";

interface SaveLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "save" | "load";
}

export function SaveLoadDialog({ open, onOpenChange, initialTab = "save" }: SaveLoadDialogProps) {
  const {
    activeTab,
    setActiveTab,
    saves,
    newSaveName,
    setNewSaveName,
    isSaving,
    isLoading,
    handleManualSave,
    handleLoad,
    handleDelete,
  } = useSaveSlots(initialTab);

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

