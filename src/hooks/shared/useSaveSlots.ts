import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/game/store";
import {
  getSaveSlots,
  deleteSaveSlot,
  type SaveSlotMetadata,
} from "@/services/storage/saveManager";
import { toast } from "sonner";

export function useSaveSlots(initialTab: "save" | "load") {
  const [activeTab, setActiveTab] = useState<"save" | "load">(initialTab);
  const [saves, setSaves] = useState<SaveSlotMetadata[]>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    kind: "load" | "delete";
    slotId: string;
  } | null>(null);

  const manualSave = useGame((s) => s.manualSave);
  const loadSlot = useGame((s) => s.loadSlot);

  const refreshSaves = useCallback(async () => {
    try {
      const data = await getSaveSlots();
      setSaves(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Failed to load save slots:", error);
    }
  }, []);

  useEffect(() => {
    refreshSaves();
  }, [refreshSaves]);

  const handleManualSave = useCallback(
    async (slotId?: string, existingName?: string) => {
      const id = slotId || `manual_${Date.now()}`;
      const name = existingName || newSaveName || `LEDGER_DAY_${useGame.getState().day}`;

      setIsSaving(true);
      try {
        await manualSave(id, name);
        setNewSaveName("");
        await refreshSaves();
        toast.success("Game saved!");
      } catch (error) {
        console.error("Ledger write failed:", error);
        toast.error("Failed to save game");
      } finally {
        setIsSaving(false);
      }
    },
    [newSaveName, manualSave, refreshSaves],
  );

  const performLoad = useCallback(
    async (slotId: string) => {
      setIsLoading(true);
      try {
        await loadSlot(slotId);
      } catch (error) {
        console.error("Recall failed:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadSlot],
  );

  const performDelete = useCallback(
    async (slotId: string) => {
      try {
        await deleteSaveSlot(slotId);
        await refreshSaves();
      } catch (error) {
        console.error("Failed to delete save slot:", error);
        toast.error("Failed to delete save");
      }
    },
    [refreshSaves],
  );

  // Destructive actions go through a pending-confirmation state that the
  // consuming component renders as an AlertDialog (no window.confirm).
  const handleLoad = useCallback((slotId: string) => {
    setPendingAction({ kind: "load", slotId });
  }, []);

  const handleDelete = useCallback((slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingAction({ kind: "delete", slotId });
  }, []);

  const confirmPendingAction = useCallback(async () => {
    const pending = pendingAction;
    setPendingAction(null);
    if (!pending) return;
    if (pending.kind === "load") await performLoad(pending.slotId);
    else await performDelete(pending.slotId);
  }, [pendingAction, performLoad, performDelete]);

  const cancelPendingAction = useCallback(() => setPendingAction(null), []);

  return {
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
  };
}
