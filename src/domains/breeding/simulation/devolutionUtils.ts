/**
 * devolutionUtils.ts - Pure utility functions for syndicate ownership devolution.
 *
 * Extracted from SyndicationHandler so the logic can be shared by the handler,
 * the breeding slice (solicitInvestor/buyoutInvestor), and the UI (projected
 * devolution view) without duplicating the threshold + tie-break rules.
 */

export interface DevolutionResult {
  owner: string;
  shares: number;
  wouldDevolve: boolean;
  newOwner: string | null;
}

/**
 * Determine the current majority owner of a syndicate and whether ownership
 * would devolve away from the current owner.
 *
 * Devolution triggers when the current owner's shares drop to or below
 * `totalShares / 2` AND another holder has **strictly more** shares.
 * Ties do NOT trigger transfer — the current owner retains on tie.
 *
 * @param shareHolders - Map of stableId -> share count
 * @param totalShares - Total shares in the syndicate
 * @param currentOwnerKey - The stableId of the current owner ("player" or NPC id)
 * @returns Devolution result with owner info and whether devolution would occur
 */
export function findMajorityOwner(
  shareHolders: Record<string, number>,
  totalShares: number,
  currentOwnerKey: string,
): DevolutionResult {
  const currentOwnerShares = shareHolders[currentOwnerKey] || 0;
  const majorityThreshold = totalShares / 2;

  // Find the holder with the most shares
  let topHolder = currentOwnerKey;
  let topShares = currentOwnerShares;
  for (const [holder, count] of Object.entries(shareHolders)) {
    if (count > topShares) {
      topShares = count;
      topHolder = holder;
    }
  }

  const wouldDevolve =
    currentOwnerShares <= majorityThreshold && topHolder !== currentOwnerKey && topShares > 0;

  return {
    owner: currentOwnerKey,
    shares: currentOwnerShares,
    wouldDevolve,
    newOwner: wouldDevolve ? topHolder : null,
  };
}

/**
 * Simulate a share change (purchase or sale) and determine whether it would
 * trigger ownership devolution.
 *
 * @param shareHolders - Current share holders map
 * @param totalShares - Total shares in the syndicate
 * @param currentOwnerKey - The stableId of the current owner
 * @param actor - The stableId making the trade
 * @param delta - Positive for purchase, negative for sale
 * @returns Whether devolution would occur and who the new owner would be
 */
export function simulateShareChange(
  shareHolders: Record<string, number>,
  totalShares: number,
  currentOwnerKey: string,
  actor: string,
  delta: number,
): { wouldDevolve: boolean; newOwner: string | null } {
  const simulated: Record<string, number> = { ...shareHolders };
  simulated[actor] = (simulated[actor] || 0) + delta;
  if (simulated[actor] <= 0) {
    delete simulated[actor];
  }

  const result = findMajorityOwner(simulated, totalShares, currentOwnerKey);
  return {
    wouldDevolve: result.wouldDevolve,
    newOwner: result.newOwner,
  };
}
