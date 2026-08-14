import { useState } from "react";
import { useGame } from "@/game/store";
import { toast } from "sonner";
import { CANCEL_REASON_USER, TOAST_PROGRAM_CANCELLED } from "@/constants/breedingConstants";

export function useCancelBreedingProgram() {
  const activeBreedingProgram = useGame((s) => s.activeBreedingProgram);
  const cancelBreedingProgram = useGame((s) => s.cancelBreedingProgram);
  const [isOpen, setIsOpen] = useState(false);

  const openCancelDialog = () => setIsOpen(true);
  const handleDialogCancel = () => setIsOpen(false);

  const handleConfirm = () => {
    const result = cancelBreedingProgram({ reason: CANCEL_REASON_USER });
    setIsOpen(false);
    if (result.ok) {
      toast.info(TOAST_PROGRAM_CANCELLED);
    } else {
      toast.error(result.reason);
    }
  };

  return {
    isOpen,
    openCancelDialog,
    handleDialogCancel,
    handleConfirm,
    activeBreedingProgram,
  };
}
