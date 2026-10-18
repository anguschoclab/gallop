/**
 * summaryLog.ts - Race summary log impact generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { LogImpact } from "@/platform/resolver/impacts";
import type { Rng } from "@/shared/common/rng";
import { generateUUID } from "@/shared/uuid/uuid";
import { getOrdinalSuffix } from "@/shared/common/ordinal";
import { formatCurrency } from "@/shared/common/formatting";
import type { Race, Horse } from "@/platform/game/types";
import { getPrizeSplitForRace } from "@/domains/race/simulation/utils";

export function generateRaceSummaryLog(
  ownedResults: Array<{ horseId: string; position: number; time: number }>,
  race: Race,
  horseMap: Map<string, Horse>,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): LogImpact | null {
  if (ownedResults.length === 0) return null;

  const summary = ownedResults
    .map((r) => {
      const horse = horseMap.get(r.horseId);
      return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
    })
    .join(", ");

  const prize = ownedResults.reduce((sum, r) => {
    const prizeSplit = getPrizeSplitForRace(race);
    if (r.position - 1 < prizeSplit.length) {
      return sum + Math.round(race.purse * prizeSplit[r.position - 1]);
    }
    return sum;
  }, 0);

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "log",
    text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
    reason: "Race summary",
  } as LogImpact;
}
