import type { Horse, GameState } from "@/game/types";

// Multiplier applied on top of the stat-based base price to account for
// pedigree quality. Sire's standing fee and dam's blue-hen score both
// contribute. Yearlings (age 1) lean harder on pedigree (60/40); older
// horses lean on stats (30/70). Returns 1 when no pedigree exists.
export function pedigreeMultiplier(
  horse: Horse,
  state: Pick<GameState, "horses">
): number {
  if (!horse.pedigree) return 1;

  const sire = horse.pedigree.sireId
    ? state.horses.find((h) => h.id === horse.pedigree!.sireId)
    : undefined;
  const dam = horse.pedigree.damId
    ? state.horses.find((h) => h.id === horse.pedigree!.damId)
    : undefined;

  // Normalize sire fee against the upper end of the elite range ($250k).
  const sireFeeNorm = Math.min(1, (sire?.stud?.standingFee ?? 0) / 250000);
  const blueHenNorm = (dam?.blueHenStatus?.blueHenScore ?? 0) / 100;

  // Yearling-weighted pedigree influence — drops with age as race results
  // start carrying the price instead.
  const pedigreeWeight = horse.age <= 1 ? 0.6 : horse.age <= 3 ? 0.4 : 0.25;
  const pedigreeBoost = (sireFeeNorm * 0.5 + blueHenNorm * 0.5) * pedigreeWeight;
  return 1 + pedigreeBoost;
}

// Helper for callers that want a pre-blended price including base value
// and pedigree multiplier in a single call.
export function pedigreeAdjustedPrice(basePrice: number, horse: Horse, state: Pick<GameState, "horses">): number {
  return Math.round(basePrice * pedigreeMultiplier(horse, state) / 50) * 50;
}
