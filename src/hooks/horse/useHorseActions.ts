import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import { isMaleHorse } from "@/core/horse/gender";
import type { Horse, AuctionSale } from "@/game/types";
import { useMemo, useEffect } from "react";
import { isPlayerOwned } from "@/core/horse/ownership";

/**
 * Hook to manage horse-specific management actions and eligibility.
 *
 * @param horseId The unique identifier of the horse.
 * @returns An object containing the horse data, consignment status, retirement eligibility, and relevant sale data.
 */
export function useHorseActions(horseId: string) {
  const horses = useGameWithShallow((s) => s.horses);
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const day = useGame((s) => s.day);

  const horse = useMemo(() => horses[horseId], [horses, horseId]);
  const resolveHorsePhenotype = useGame((s: StoreType) => s.resolveHorsePhenotype);

  useEffect(() => {
    if (horse && horse.phenotypeResolved === false) {
      resolveHorsePhenotype(horseId);
    }
  }, [horse, horseId, resolveHorsePhenotype]);

  const result = useMemo(() => {
    if (!horse) {
      return {
        isConsigned: false,
        canRetireToStud: false,
        canRetireToPasture: false,
        consignedSale: undefined,
        eligibleSale: undefined,
      };
    }

    const isConsigned = !!horse.consignedSaleId;

    const canRetireToStud =
      isPlayerOwned(horse) &&
      isMaleHorse(horse.gender) &&
      horse.age >= 3 &&
      !horse.stud?.atStud &&
      !isConsigned;

    const canRetireToPasture = isPlayerOwned(horse) && horse.lifecycleStatus === "active" && !isConsigned;

    const consignedSale = isConsigned
      ? auctions.find((a: AuctionSale) => a.id === horse.consignedSaleId)
      : undefined;

    // Find eligible upcoming sales to consign to
    const eligibleSale =
      !isConsigned && isPlayerOwned(horse)
        ? auctions.find((a: AuctionSale) => {
            if (a.resolved) return false;
            const ageMatch =
              (horse.age === 0 && (a.kind === "weanling" || a.kind === "weanling_south")) ||
              ((horse.age === 1 || horse.age === 2) &&
                (a.kind === "yearling" || a.kind === "yearling_south"));
            return ageMatch;
          })
        : undefined;

    return {
      isConsigned,
      canRetireToStud,
      canRetireToPasture,
      consignedSale,
      eligibleSale,
    };
  }, [horse, auctions]);

  if (!horse) {
    return {
      horse: null,
      isConsigned: false,
      canRetireToStud: false,
      canRetireToPasture: false,
      consignedSale: undefined,
      eligibleSale: undefined,
      day,
    };
  }

  return {
    horse,
    ...result,
    day,
  };
}
