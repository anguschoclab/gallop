import { useMemo } from "react";
import { useGame } from "@/platform/game/store";
import { calculateBreedingCompatibility } from "@/domains/breeding/simulation/compatibility";

/**
 * Hook to calculate breeding compatibility between a sire and a dam.
 *
 * @param sireId The unique identifier of the sire.
 * @param damId The unique identifier of the dam.
 * @returns An object containing the sire, dam, and their breeding compatibility result.
 */
export function useBreedingCompatibility(sireId: string, damId: string) {
  const horses = useGame((s) => s.horses);

  const sire = useMemo(() => (sireId ? horses[sireId] : undefined), [horses, sireId]);
  const dam = useMemo(() => (damId ? horses[damId] : undefined), [horses, damId]);

  const compatibility = useMemo(
    () => (sire && dam ? calculateBreedingCompatibility(sire, dam) : null),
    [sire, dam],
  );

  return { sire, dam, compatibility };
}
