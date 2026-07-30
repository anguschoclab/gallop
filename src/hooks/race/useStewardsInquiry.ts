/**
 * useStewardsInquiry.ts — Post-race stewards inquiry hook for player-watched races.
 *
 * Called after `resolveRaceWithImpacts` fires when the player is watching a race
 * in the UI. Rolls against `calculateInquiryProbability`, and if an inquiry is
 * triggered, pushes a resolved StewardsInquiry into the store so that
 * StewardsInquiryOverlay picks it up.
 *
 * The pipeline's stewardsPhase skips any race that has a player-entered horse,
 * so this hook is the sole path for player-race inquiries.
 */

import { useCallback } from "react";
import { useGame } from "@/game/store";
import { calculateInquiryProbability } from "@/core/racing/inquiryProbability";
import {
  createStewardsInquiry,
  resolveInquiry,
  type InquiryOutcome,
  type InquiryType,
} from "@/core/stewards/stewardTypes";
import { getRaceGrade } from "@/core/racing/nominationFees";
import { createRng, hashStr } from "@/core/common/rng";
import type { Race } from "@/game/types";

type FinishEntry = { horseId: string; position: number; time: number };

/**
 * Returns a callback that can be called after a player race resolves.
 * Pass it the finished race and result order; it will roll for an inquiry
 * and push to the store if one fires.
 */
export function useStewardsInquiry() {
  const addStewardsInquiry = useGame((s) => s.addStewardsInquiry);
  const day = useGame((s) => s.day);

  return useCallback(
    (race: Race, result: FinishEntry[]) => {
      if (!race || result.length < 2) return;

      const grade = getRaceGrade(race);

      // Detect photo finish: margin between 1st and 2nd < 0.05 s
      const sorted = [...result].sort((a, b) => a.position - b.position);
      const isPhotoFinish = sorted.length >= 2 && Math.abs(sorted[0].time - sorted[1].time) < 0.05;

      const probability = calculateInquiryProbability({
        isPhotoFinish,
        grade,
        foulFlagged: false,
      });

      // Seeded RNG so the same race always produces the same outcome
      const rng = createRng(hashStr(`stewards_player_${race.id}_${day}`));
      if (rng.next() > probability) return;

      // Pick accused horse (not the winner — makes narrative sense)
      const nonWinners = result.filter((r) => r.position > 1);
      const candidatePool = nonWinners.length > 0 ? nonWinners : result;
      const accused = candidatePool[Math.floor(rng.next() * candidatePool.length)];

      const reporter = result.find((r) => r.horseId !== accused.horseId);

      const types: InquiryType[] = ["interference", "improper_riding", "lane_violation"];
      const type = types[Math.floor(rng.next() * types.length)];

      const descriptions: Record<InquiryType, string> = {
        interference: "Alleged interference in the stretch",
        improper_riding: "Improper riding tactics reported",
        lane_violation: "Lane violation reported",
        equipment_issue: "Equipment irregularity noted",
        medication_violation: "Medication violation suspected",
        other: "General conduct review",
      };

      const accusedJockeyId = race.entries.find((e) => e.horseId === accused.horseId)?.jockeyId;

      const baseInquiry = createStewardsInquiry(
        race.id,
        day,
        type,
        accused.horseId,
        descriptions[type],
        { reportingHorseId: reporter?.horseId, accusedJockeyId },
      );

      // Auto-resolve immediately (same as the pipeline phase)
      const outcomes: InquiryOutcome[] = [
        "no_action",
        "warning",
        "fine",
        "disqualification",
        "suspension",
        "dq_placed_last",
      ];
      const outcome = outcomes[Math.floor(rng.next() * outcomes.length)];
      const fineAmount = outcome === "fine" ? Math.round(500 + rng.next() * 4500) : undefined;
      const suspensionDays = outcome === "suspension" ? Math.round(3 + rng.next() * 27) : undefined;

      const resolved = {
        ...resolveInquiry(baseInquiry, outcome, fineAmount, suspensionDays),
        resolvedDay: day,
      };

      addStewardsInquiry(resolved);
    },
    [addStewardsInquiry, day],
  );
}
