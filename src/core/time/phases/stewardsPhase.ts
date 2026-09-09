/**
 * phases/stewardsPhase.ts - Stewards inquiry phase
 *
 * This file provides the stewards inquiry phase that generates and resolves
 * race-day inquiries after race resolution.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/constants/game (PHASE_ORDER_STEWARDS), @/core/stewards/stewardTypes (generateRandomInquiry, resolveInquiry, createStewardsInquiry), @/core/resolver/impacts/index (AnyImpact), @/game/uuid (generateUUID), @/core/common/rng (createRng, hashStr)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { PHASE_ORDER_STEWARDS } from "@/constants";
import { resolveInquiry, type InquiryOutcome } from "@/core/stewards/stewardTypes";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type {
  StewardsInquiryImpact,
  StewardsResolutionImpact,
  RaceResultAdjustmentImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { createRng, hashStr } from "@/core/common/rng";

/**
 * Stewards Phase (Order 73)
 * Generates inquiries for recently resolved races and auto-resolves some.
 */
export const stewardsPhase: PipelinePhase = {
  name: "stewards",
  order: PHASE_ORDER_STEWARDS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // 1. Process explicit StewardsInquiryIntent instances (objections / protests)
    const inquiryIntents = (context.intents || []).filter(
      (i): i is import("@/core/resolver/systemIntents").StewardsInquiryIntent =>
        i.type === "stewards_inquiry",
    );

    const processedRaceIds = new Set<string>();

    for (const intent of inquiryIntents) {
      const race = state.races[intent.raceId];
      if (!race) continue;
      processedRaceIds.add(race.id);

      const accusedEntry = race.entries?.find((e: { horseId: string }) => e.horseId === intent.accusedHorseId);
      const accusedJockeyId = accusedEntry?.jockeyId;

      const outcomes: InquiryOutcome[] = [
        "no_action",
        "warning",
        "fine",
        "disqualification",
        "suspension",
      ];
      const outcome = outcomes[Math.floor(context.dailyRng.next() * outcomes.length)];

      const resolvedInquiry = {
        id: generateUUID(context.dailyRng),
        raceId: race.id,
        day: newDay,
        type: intent.inquiryType,
        status: "resolved" as const,
        accusedHorseId: intent.accusedHorseId,
        accusedJockeyId,
        reportingHorseId: intent.reportingHorseId,
        description: intent.description || "Steward inquiry lodged",
        outcome,
        resolvedDay: newDay,
      };

      impacts.push({
        id: generateUUID(context.dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "stewards",
        logLevel: "always",
        type: "stewards_inquiry",
        inquiry: resolvedInquiry,
        reason: resolvedInquiry.description,
      } as StewardsInquiryImpact);

      impacts.push({
        id: generateUUID(context.dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "stewards",
        logLevel: "always",
        type: "stewards_resolution",
        inquiryId: resolvedInquiry.id,
        outcome,
        reason: `Outcome: ${outcome}`,
      } as StewardsResolutionImpact);
    }

    // 2. Find races that were resolved today for simulation-driven routine inquiries
    const resolvedRaces = Object.values(state.races).filter(
      (r) => r.resolved && r.result && r.result.length > 0,
    );

    // Build a set of player-owned horse IDs so we can skip their races.
    // Player races are handled by the useStewardsInquiry hook in the UI,
    // which gives the player a contextual post-race notification instead.
    const playerHorseIds = new Set(
      Object.values(state.horses)
        .filter((h) => h.ownership?.type === "player")
        .map((h) => h.id),
    );

    for (const race of resolvedRaces) {
      if (processedRaceIds.has(race.id)) continue;
      // Skip if race already has inquiries
      if (race.inquiries && race.inquiries.length > 0) continue;

      // Skip races with a player-entered horse ONLY if the interactive UI viewer is active.
      // In headless / auto-advance mode, the pipeline evaluates player races so inquiries aren't dropped.
      const hasPlayerEntry = race.entries.some((e: { horseId: string }) =>
        playerHorseIds.has(e.horseId),
      );
      if (hasPlayerEntry && context.isInteractiveRaceView) continue;

      const horseIds = race.entries.map((e: { horseId: string }) => e.horseId);
      if (horseIds.length < 2) continue;

      // Generate a random inquiry with 5% chance
      const rng = createRng(hashStr(`stewards_${race.id}_${newDay}`));
      if (rng.next() > 0.05) continue;

      const accusedHorseId = horseIds[Math.floor(rng.next() * horseIds.length)];
      const reportingHorseId = horseIds.filter((h: string) => h !== accusedHorseId)[
        Math.floor(rng.next() * (horseIds.length - 1))
      ];

      const types = ["interference", "improper_riding", "lane_violation"] as const;
      const type = types[Math.floor(rng.next() * types.length)];

      const descriptions: Record<typeof type, string> = {
        interference: "Alleged interference in the stretch",
        improper_riding: "Improper riding tactics reported",
        lane_violation: "Lane violation reported",
      };

      const entry = race.entries.find((e: { horseId: string }) => e.horseId === accusedHorseId);
      const accusedJockeyId = entry?.jockeyId;

      const inquiry = {
        id: generateUUID(rng),
        raceId: race.id,
        day: newDay,
        type,
        status: "pending" as const,
        accusedHorseId,
        accusedJockeyId,
        reportingHorseId,
        description: descriptions[type],
      };

      // Auto-resolve inquiry immediately (for gameplay flow)
      const outcomes: InquiryOutcome[] = [
        "no_action",
        "warning",
        "fine",
        "disqualification",
        "suspension",
        "dq_placed_last",
      ];
      const outcome = outcomes[Math.floor(rng.next() * outcomes.length)];

      let fineAmount: number | undefined;
      let suspensionDays: number | undefined;

      if (outcome === "fine") {
        fineAmount = Math.round(500 + rng.next() * 4500);
      } else if (outcome === "suspension") {
        suspensionDays = Math.round(3 + rng.next() * 27);
      }

      const resolvedInquiry = {
        ...inquiry,
        status: "resolved" as const,
        outcome,
        fineAmount,
        suspensionDays,
        resolvedDay: newDay,
      };

      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "stewards",
        logLevel: "always",
        type: "stewards_inquiry",
        inquiry: resolvedInquiry,
        reason: `Stewards inquiry: ${inquiry.description}`,
      } as StewardsInquiryImpact);

      // Emit stewards_resolution so the SystemHandler applies jockey suspensions
      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "stewards",
        logLevel: "always",
        type: "stewards_resolution",
        inquiryId: resolvedInquiry.id,
        outcome,
        fineAmount,
        suspensionDays,
        reason: `Stewards resolution: ${outcome}`,
      } as StewardsResolutionImpact);

      // If DQ, emit race result adjustment
      if (outcome === "disqualification" || outcome === "dq_placed_last") {
        const originalResults = race.result!.map(
          (r: { horseId: string; position: number; time: number }) => ({
            horseId: r.horseId,
            position: r.position,
            time: r.time,
          }),
        );

        const adjustedResults = originalResults.map(
          (r: { horseId: string; position: number; time: number }) => {
            if (r.horseId === accusedHorseId) {
              return {
                ...r,
                position: outcome === "dq_placed_last" ? originalResults.length : 99,
              };
            }
            return r;
          },
        );

        // Re-rank non-DQ horses by position
        const nonDq = adjustedResults.filter(
          (r: { horseId: string }) => r.horseId !== accusedHorseId,
        );
        nonDq.sort((a: { time: number }, b: { time: number }) => a.time - b.time);
        nonDq.forEach((r: { position: number }, i: number) => {
          r.position = i + 1;
        });

        const dqEntry = adjustedResults.find(
          (r: { horseId: string }) => r.horseId === accusedHorseId,
        );
        impacts.push({
          id: generateUUID(rng),
          intentId: "",
          day: newDay,
          phase: "stewards",
          logLevel: "always",
          type: "race_result_adjustment",
          raceId: race.id,
          originalResults,
          adjustedResults: dqEntry ? [...nonDq, dqEntry] : nonDq,
          reason: `DQ adjustment for ${accusedHorseId}`,
        } as RaceResultAdjustmentImpact);
      }
    }

    return {
      ...context,
      impacts: [...(context.impacts ?? []), ...impacts],
    };
  },
};
