import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/game/store";
import { getSaveSlots, deleteSaveSlot, type SaveSlotMetadata } from "@/services/saveManager";
import { toast } from "sonner";

export function useSaveSlots(initialTab: "save" | "load") {
  const [activeTab, setActiveTab] = useState<"save" | "load">(initialTab);
  const [saves, setSaves] = useState<SaveSlotMetadata[]>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const manualSave = useGame((s) => s.manualSave);
  const loadSlot = useGame((s) => s.loadSlot);

  const refreshSaves = useCallback(async () => {
    const data = await getSaveSlots();
    setSaves(data.sort((a, b) => b.timestamp - a.timestamp));
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

  const handleLoad = useCallback(
    async (slotId: string) => {
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
    },
    [loadSlot],
  );

  const handleDelete = useCallback(
    async (slotId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("CONFIRM PURGE: Permanent deletion of archive entry.")) {
        return;
      }

      await deleteSaveSlot(slotId);
      await refreshSaves();
    },
    [refreshSaves],
  );

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
  };
}
