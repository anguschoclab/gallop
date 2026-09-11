/**
 * postRaceImpacts.ts - Shared post-race impact generation helper.
 *
 * Extracted from raceResolution.ts to eliminate a 24-line duplicate (105 tokens)
 * found by jscpd. Both the graded and ungraded race resolution paths share
 * the same track-record/HOF + claiming impact generation pattern.
 *
 * Per PR 8 of the megaplan.
 */

import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { Race, Horse, RaceRunner } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import type { Rng } from "@/core/common/rng";
import type { TrackRecord } from "@/core/history/historyTypes";
import { checkTrackRecordAndHof, resolveClaimingForRace } from "./raceResolutionHelpers";
import type { PipelinePorts } from "@/core/time/pipelinePorts";

/**
 * Generate post-race impacts: track records, Hall of Fame, and claiming resolution.
 * Pure: returns impacts array, does not mutate state.
 * @param race - The race being resolved.
 * @param impactRunners - Runners in the race.
 * @param horseMap - Map of horse IDs to horses.
 * @param newDay - The new game day.
 * @param trackRecords - Existing track records.
 * @param hallOfFameIds - Set of Hall of Fame horse IDs.
 * @param contextIntents - Claiming intents for this race.
 * @param allHorses - All horses in the game.
 * @param rng - Random number generator.
 * @param ports - Injected pipeline ports.
 * @param result - Race result array.
 */
export function generatePostRaceImpacts(
  race: Race,
  impactRunners: RaceRunner[],
  horseMap: Map<string, Horse>,
  newDay: number,
  trackRecords: Record<string, TrackRecord>,
  hallOfFameIds: Set<string>,
  contextIntents: ClaimingIntent[],
  allHorses: Horse[],
  rng: Rng,
  ports: PipelinePorts | undefined,
  result: { horseId: string; position: number; time: number }[],
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  const trackRecordAndHofImpacts = checkTrackRecordAndHof(
    race,
    result,
    impactRunners,
    horseMap,
    newDay,
    trackRecords,
    hallOfFameIds,
    ports,
  );
  impacts.push(...trackRecordAndHofImpacts);

  if (race.claimingPrice) {
    const claimingImpacts = resolveClaimingForRace(
      race,
      contextIntents,
      allHorses,
      newDay,
      rng,
      ports,
    );
    impacts.push(...claimingImpacts);
  }

  return impacts;
}
