/**
 * SaveLoadDialog.tsx - UI for managing game save slots
 */

import { useState, useEffect } from "react";
import { useGame } from "@/game/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen, Trash2, Calendar, Clock, DollarSign, Trophy } from "lucide-react";
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

  // Load saves metadata on open
  useEffect(() => {
    if (open) {
      refreshSaves();
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const refreshSaves = async () => {
    const data = await getSaveSlots();
    // Sort by timestamp descending (newest first)
    setSaves(data.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleManualSave = async (slotId?: string, existingName?: string) => {
    const id = slotId || `manual_${Date.now()}`;
    const name = existingName || newSaveName || `Day ${useGame.getState().day} Save`;
    
    setIsSaving(true);
    try {
      await manualSave(id, name);
      setNewSaveName("");
      await refreshSaves();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (slotId: string) => {
    if (!window.confirm("Are you sure you want to load this save? Unsaved current progress will be lost.")) {
      return;
    }
    
    setIsLoading(true);
    try {
      await loadSlot(slotId);
      // loadSlot triggers window.location.reload()
    } catch (error) {
      console.error("Load failed:", error);
      setIsLoading(false);
    }
  };

  const handleDelete = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this save slot permanently?")) {
      return;
    }
    
    await deleteSaveSlot(slotId);
    await refreshSaves();
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-gold-muted text-cream">
        <DialogHeader>
          <DialogTitle className="text-2xl font-[family-name:var(--font-display)] flex items-center gap-2">
            {activeTab === "save" ? <Save className="h-6 w-6 text-gold" /> : <FolderOpen className="h-6 w-6 text-gold" />}
            {activeTab === "save" ? "Save Game" : "Load Game"}
          </DialogTitle>
          <DialogDescription className="text-cream-muted font-[family-name:var(--font-body)]">
            Manage your stable's progress snapshots.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="save" className="data-[state=active]:bg-gold data-[state=active]:text-slate-900">
              Save Progress
            </TabsTrigger>
            <TabsTrigger value="load" className="data-[state=active]:bg-gold data-[state=active]:text-slate-900">
              Load Snapshot
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <TabsContent value="save" className="space-y-4">
              <div className="flex gap-2 items-end pb-2 border-b border-slate-800 mb-4">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="new-save-name">New Save Name</Label>
                  <Input 
                    id="new-save-name" 
                    placeholder="Enter save name..." 
                    value={newSaveName}
                    onChange={(e) => setNewSaveName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-cream focus-visible:ring-gold"
                  />
                </div>
                <Button 
                  onClick={() => handleManualSave()} 
                  disabled={isSaving}
                  className="bg-gold hover:bg-gold-bright text-slate-900 font-bold"
                >
                  Create New Slot
                </Button>
              </div>

              {saves.filter(s => !s.isAutoSave).map((save) => (
                <SaveSlotCard 
                  key={save.id} 
                  save={save} 
                  onAction={() => handleManualSave(save.id, save.name)}
                  onDelete={(e) => handleDelete(save.id, e)}
                  actionLabel="Overwrite"
                  formatTimestamp={formatTimestamp}
                />
              ))}
              
              {saves.filter(s => !s.isAutoSave).length === 0 && (
                <div className="text-center py-8 text-cream-muted italic">
                  No manual saves found.
                </div>
              )}
            </TabsContent>

            <TabsContent value="load" className="space-y-4">
              {saves.map((save) => (
                <SaveSlotCard 
                  key={save.id} 
                  save={save} 
                  onAction={() => handleLoad(save.id)}
                  onDelete={(e) => handleDelete(save.id, e)}
                  actionLabel="Load"
                  formatTimestamp={formatTimestamp}
                  isLoading={isLoading}
                />
              ))}
              
              {saves.length === 0 && (
                <div className="text-center py-8 text-cream-muted italic">
                  No save snapshots found.
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-cream hover:bg-slate-800">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveSlotCard({ 
  save, 
  onAction, 
  onDelete, 
  actionLabel, 
  formatTimestamp,
  isLoading = false
}: { 
  save: SaveSlotMetadata; 
  onAction: () => void;
  onDelete: (e: React.MouseEvent) => void;
  actionLabel: string;
  formatTimestamp: (ts: number) => string;
  isLoading?: boolean;
}) {
  return (
    <Card 
      className={cn(
        "bg-slate-800 border-slate-700 hover:border-gold-muted transition-colors cursor-pointer group",
        save.isAutoSave && "border-blue-500/30 bg-blue-900/10"
      )}
      onClick={onAction}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cream group-hover:text-gold transition-colors truncate max-w-[150px]">
                {save.name}
              </span>
              {save.isAutoSave && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wider font-bold">
                  Auto
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-cream-muted">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Day {save.gameDay}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(save.timestamp)}
              </span>
            </div>
          </div>
          
          <div className="space-y-1 flex flex-col items-end pr-4 border-r border-slate-700/50">
            <span className="text-xs font-medium text-cream flex items-center gap-1 truncate max-w-[140px]">
              <Trophy className="h-3 w-3 text-gold" />
              {save.stableName}
            </span>
            <span className="text-xs text-success flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(save.cash)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-cream-muted hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Delete Save"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            disabled={isLoading}
            className={cn(
              "font-bold min-w-[80px]",
              actionLabel === "Load" ? "bg-blue-600 hover:bg-blue-500" : "bg-gold hover:bg-gold-bright text-slate-900"
            )}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
