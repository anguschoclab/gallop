import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import type { Horse, Stable, AuctionSaleKind } from "@/game/types";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { calculateNpcHorseValue } from "@/core/horse/pricing";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import type { Rng } from "@/core/common/rng";
import {
  AUCTION_RESERVE_SPECIALIST,
  AUCTION_RESERVE_AGGRESSIVE,
  AUCTION_RESERVE_SPECIALIST_LOW,
  AUCTION_RESERVE_BREEDER,
  AUCTION_RESERVE_CONSERVATIVE,
  AUCTION_RESERVE_ELITE,
} from "@/constants";
import { isLotEligible } from "./engine";

export interface ConsignmentContext {
  stable: Stable;
  kind: AuctionSaleKind;
  allHorses: readonly Horse[];
  rng: Rng;
  owned: Horse[];
  fillies: Horse[];
  colts: Horse[];
  unraced: Horse[];
  fading: Horse[];
  top: Horse[];
}

export type ConsignmentPolicyResult = {
  consign: Horse[];
  freshCount: number;
  reserveMultiplier: number;
};

const CONSIGNMENT_STRATEGIES: Record<
  Stable["personality"],
  (ctx: ConsignmentContext) => ConsignmentPolicyResult
> = {
  aggressive: (ctx) => ({
    consign: ctx.owned.filter((h) => h.age === 0).slice(0, 3),
    freshCount:
      ctx.kind === "weanling" || ctx.kind === "weanling_south"
        ? ctx.rng.int(1, 3)
        : ctx.rng.int(0, 2),
    reserveMultiplier: 0.5,
  }),
  conservative: (ctx) => ({
    consign: ctx.owned.length > 8 ? ctx.owned.slice(8, 10) : [],
    freshCount: ctx.rng.int(0, 1),
    reserveMultiplier: AUCTION_RESERVE_CONSERVATIVE,
  }),
  developer: (ctx) => ({
    consign:
      ctx.kind === "yearling" || ctx.kind === "yearling_south"
        ? ctx.owned.slice(0, 4)
        : ctx.kind === "weanling" || ctx.kind === "weanling_south"
          ? ctx.owned.slice(0, 2)
          : ctx.owned.slice(0, 1),
    freshCount: ctx.rng.int(1, 3),
    reserveMultiplier: 0.5,
  }),
  "win-now": (ctx) => {
    let consign: Horse[] = [];
    if (ctx.kind === "broodmare")
      consign = ctx.fading.filter((h) => h.gender === "mare").slice(0, 3);
    else if (ctx.kind === "racing_age")
      consign = ctx.fading.filter((h) => h.gender !== "mare").slice(0, 3);
    else if (ctx.kind === "2yo_training")
      consign = ctx.unraced.filter((h) => h.age === 2).slice(0, 3);
    else if (ctx.kind === "mixed") consign = ctx.fading.slice(0, 2);

    return {
      consign,
      reserveMultiplier: 0.4,
      freshCount: ctx.rng.int(0, 2),
    };
  },
  specialist: (ctx) => {
    const offNiche = ctx.owned.filter((h) => {
      if (
        ctx.stable.preferredDistance &&
        Math.abs(h.distanceAptitude - ctx.stable.preferredDistance) > 600
      )
        return true;
      if (ctx.stable.preferredSurface) {
        const apts = h.surfaceAptitude;
        const best = (Object.entries(apts) as [keyof typeof apts, number][]).sort(
          (a, b) => b[1] - a[1],
        )[0];
        if (best[0] !== ctx.stable.preferredSurface) return true;
      }
      return false;
    });
    return {
      consign: offNiche.slice(0, 3),
      freshCount: ctx.rng.int(0, 2),
      reserveMultiplier: AUCTION_RESERVE_SPECIALIST,
    };
  },
  breeder: (ctx) => ({
    consign:
      ctx.kind === "broodmare"
        ? ctx.fading.filter((h) => h.gender === "mare").slice(0, 4)
        : ctx.colts.slice(0, 4),
    freshCount: ctx.rng.int(2, 4),
    reserveMultiplier: AUCTION_RESERVE_BREEDER,
  }),
  trader: (ctx) => ({
    consign: ctx.owned.slice(0, 5),
    freshCount: ctx.rng.int(1, 3),
    reserveMultiplier: 0.55,
  }),
  prestige: (ctx) => ({
    consign: ctx.top.filter((h) => h.fame >= 25 || h.potential >= 85).slice(0, 2),
    freshCount: ctx.rng.int(0, 1),
    reserveMultiplier: AUCTION_RESERVE_ELITE,
  }),
};

export function personalityConsignmentPolicy(
  stable: Stable,
  kind: AuctionSaleKind,
  allHorses: readonly Horse[],
  rng: Rng,
): { consign: Horse[]; freshCount: number; reserveMultiplier: number } {
  const owned: Horse[] = [];
  for (const h of allHorses) {
    if (
      h.ownership?.type === "npc" &&
      h.ownership.stableId === stable.id &&
      isLotEligible(h, kind)
    ) {
      owned.push(ensurePhenotypeResolved(h));
    }
  }
  const p = stable.personality;

  const fillies = owned.filter((h) => isFemaleHorse(h.gender));
  const colts = owned.filter((h) => isMaleHorse(h.gender) || h.gender === "gelding");
  const unraced = owned.filter((h) => h.careerStarts === 0);
  const fading = owned.filter((h) => h.age >= h.peakAge + 2);
  const top = [...owned].sort((a, b) => b.fame + b.potential - (a.fame + a.potential));

  const ctx: ConsignmentContext = {
    stable,
    kind,
    allHorses,
    rng,
    owned,
    fillies,
    colts,
    unraced,
    fading,
    top,
  };

  const strategy =
    CONSIGNMENT_STRATEGIES[p] ||
    (() => ({
      consign: [],
      freshCount: 0,
      reserveMultiplier: 0.5,
    }));

  const result = strategy(ctx);

  result.consign = result.consign.filter((h) => !h.consignedSaleId);

  return result;
}

export { calculateNpcHorseValue, pedigreeMultiplier };
