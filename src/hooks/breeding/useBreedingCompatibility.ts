import { useMemo } from "react";
import { useGame } from "@/game/store";
import { calculateBreedingCompatibility } from "@/core/breeding/compatibility";
import type { Horse } from "@/game/types";

/**
 * Hook to calculate breeding compatibility between a sire and a dam.
 *
 * @param sireId The unique identifier of the sire.
 * @param damId The unique identifier of the dam.
 * @returns An object containing the sire, dam, and their breeding compatibility result.
 */
export function useBreedingCompatibility(sireId: string, damId: string) {
  const horses = useGame((s) => s.horses);

  const sire = useMemo(() => horses.find((h) => h.id === sireId), [horses, sireId]);
  const dam = useMemo(() => horses.find((h) => h.id === damId), [horses, damId]);

  const compatibility = useMemo(
    () => (sire && dam ? calculateBreedingCompatibility(sire, dam) : null),
    [sire, dam],
  );

  return { sire, dam, compatibility };
}
