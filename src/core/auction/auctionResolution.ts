import type { Horse, Stable, AuctionSale, AuctionLot } from "@/game/types";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { createRng, hashStr } from "@/core/common/rng";
import { calculateNpcBid } from "./engine";
import { resolveSaleHouse } from "@/core/prestige";

export type ResolvedSale = {
  lots: AuctionLot[];
  log: string[];
};

export function resolveAuctionSale(
  sale: AuctionSale,
  stables: Stable[],
  allHorses: Horse[],
): ResolvedSale {
  const log: string[] = [];
  const updatedLots: AuctionLot[] = [];

  const bidderStables = stables.filter((s) => s.isMajor);
  const horseMap = new Map(allHorses.map((h) => [h.id, h]));
  const house = resolveSaleHouse(sale);

  for (const lot of sale.lots) {
    if (lot.withdrawn) {
      updatedLots.push(lot);
      continue;
    }

    let horse = horseMap.get(lot.horseId);
    if (!horse) {
      updatedLots.push({ ...lot, passed: true });
      continue;
    }
    horse = ensurePhenotypeResolved(horse);

    if (horse.lifecycleStatus === "deceased") {
      updatedLots.push({ ...lot, withdrawn: true });
      log.push(`${horse.name} — withdrawn (deceased)`);
      continue;
    }

    let currentBid = lot.hammerPrice ?? 0;
    let currentWinner: string | undefined = lot.soldToStableId;

    const eligibleBidders = bidderStables.filter((s) => s.id !== lot.consignorStableId);

    let raised = true;
    while (raised) {
      raised = false;
      for (const stable of eligibleBidders) {
        if (stable.id === currentWinner) continue;
        const rng = createRng(hashStr(lot.id + stable.id + String(currentBid)));
        const bid = calculateNpcBid(
          stable,
          horse,
          currentBid,
          sale.kind,
          rng,
          allHorses,
          horseMap,
          undefined,
          undefined,
          house,
        );

        if (bid !== null && bid > currentBid) {
          currentBid = bid;
          currentWinner = stable.id;
          raised = true;
        }
      }
    }

    if (currentBid < lot.reservePrice || currentWinner === undefined) {
      updatedLots.push({ ...lot, passed: true, hammerPrice: undefined, soldToStableId: undefined });
      log.push(`${horse.name} — passed (reserve not met)`);
    } else {
      updatedLots.push({
        ...lot,
        hammerPrice: currentBid,
        soldToStableId: currentWinner,
        passed: false,
      });
      const winner = stables.find((s) => s.id === currentWinner);
      log.push(
        `${horse.name} — sold to ${winner?.name ?? "Unknown"} for $${currentBid.toLocaleString()}`,
      );
    }
  }

  return { lots: updatedLots, log };
}
