/**
 * SaveLoadDialog.tsx - "Stable Ledger" Industrial UI
 * Redesigned for thematic depth and high-craft utility.
 */

import { useSaveSlots } from "@/platform/game/hooks/useSaveSlots";
import { LedgerEntry } from "@/domains/settings/ui/LedgerEntry";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { buttonVariants } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { SaveTab } from "@/domains/settings/ui/SaveTab";
import { LoadTab } from "@/domains/settings/ui/LoadTab";
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
    pendingAction,
    confirmPendingAction,
    cancelPendingAction,
  } = useSaveSlots(initialTab);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-slate-950 border-primary/30 p-0 overflow-hidden rounded-none shadow-[0_0_50px_color-mix(in oklab, black 50%, transparent)]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

          <div className="relative border-b border-primary/20 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-accent-bright uppercase tracking-[0.15em] font-[family-name:var(--font-display)] text-sm font-bold">
                  <Database className="h-4 w-4" />
                  Save & Load
                </div>
                <DialogTitle className="text-3xl font-[family-name:var(--font-display)] text-foreground">
                  Saved Games
                </DialogTitle>
              </div>
              <div className="text-right font-mono text-[10px] text-primary/40 uppercase leading-tight"></div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "save" | "load")}
            className="w-full"
          >
            <div className="px-6 py-2 bg-slate-900/30 border-b border-primary/10">
              <TabsList className="h-10 bg-transparent gap-8 p-0">
                <TabsTrigger
                  value="save"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground uppercase tracking-wide text-xs font-bold transition-all p-0 h-full"
                >
                  Save
                </TabsTrigger>
                <TabsTrigger
                  value="load"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground uppercase tracking-wide text-xs font-bold transition-all p-0 h-full"
                >
                  Load
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

          <div className="p-4 bg-slate-900/80 border-t border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono text-success/60 uppercase">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-primary/60 hover:text-primary hover:bg-primary/5 font-mono text-xs uppercase tracking-wide"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(o) => {
          if (!o) cancelPendingAction();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === "load" ? "Load Saved Game" : "Delete Saved Game"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "load"
                ? "Current live state will be overwritten by this ledger entry. This action cannot be undone."
                : "This will permanently delete the archive entry. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPendingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmPendingAction}
            >
              {pendingAction?.kind === "load" ? "Load" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
