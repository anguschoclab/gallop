import type { Horse, Stable, AuctionSale, AuctionLot } from "@/platform/game/types";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import { createRng, hashStr } from "@/shared/common/rng";
import { calculateNpcBid } from "@/domains/auction/simulation/engine";
import { resolveSaleHouse } from "@/domains/prestige/simulation";

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
  // Cash already committed to lots each stable won earlier in this sale.
  const committed = new Map<string, number>();
  const withCommitted = (s: Stable): Stable => {
    const c = committed.get(s.id);
    return c ? { ...s, cash: Math.max(0, s.cash - c) } : s;
  };

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
          withCommitted(stable),
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

    if (currentBid < lot.reservePrice || (currentWinner === undefined && currentBid === 0)) {
      const hadBids = currentBid > 0;
      updatedLots.push({ ...lot, passed: true, hammerPrice: undefined, soldToStableId: undefined });
      log.push(`${horse.name} — passed (${hadBids ? "reserve not met" : "no bids"})`);
    } else {
      updatedLots.push({
        ...lot,
        hammerPrice: currentBid,
        soldToStableId: currentWinner,
        passed: false,
      });
      if (currentWinner) {
        committed.set(currentWinner, (committed.get(currentWinner) ?? 0) + currentBid);
      }
      const winner = stables.find((s) => s.id === currentWinner);
      log.push(
        `${horse.name} — sold to ${winner?.name ?? "Unknown"} for $${currentBid.toLocaleString()}`,
      );
    }
  }

  return { lots: updatedLots, log };
}
