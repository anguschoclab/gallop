import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import { isMaleHorse } from "@/core/horse/gender";
import type { Horse, AuctionSale } from "@/game/types";
import { useMemo } from "react";

/**
 * Hook to manage horse-specific management actions and eligibility.
 *
 * @param horseId The unique identifier of the horse.
 * @returns An object containing the horse data, consignment status, retirement eligibility, and relevant sale data.
 */
export function useHorseActions(horseId: string) {
  const horses = (useGame as any)((s) => s.horses, shallow);
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const day = useGame((s) => s.day);

  const horse = useMemo(() => horses.find((h) => h.id === horseId), [horses, horseId]);

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

  const result = useMemo(() => {
    const isConsigned = !!horse.consignedSaleId;

    const canRetireToStud =
      horse.owned &&
      isMaleHorse(horse.gender) &&
      horse.age >= 3 &&
      !horse.stud?.atStud &&
      !isConsigned;

    const canRetireToPasture = horse.owned && horse.lifecycleStatus === "active" && !isConsigned;

    const consignedSale = isConsigned
      ? auctions.find((a: AuctionSale) => a.id === horse.consignedSaleId)
      : undefined;

    // Find eligible upcoming sales to consign to
    const eligibleSale =
      !isConsigned && horse.owned
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

  return {
    horse,
    ...result,
    day,
  };
}
