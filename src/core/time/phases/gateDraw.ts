/**
 * phases/gateDraw.ts - Gate draw phase
 *
 * Assigns gate (post position) numbers to race entries before race day.
 * G1 races draw 5 days before the race with an email notification.
 * All other races draw 2 days before the race silently.
 * Late entries and filler horses get remaining gates at simulation time.
 */

import { PHASE_ORDER_GATE_DRAW } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { Race } from "@/core/race/types";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { InboxImpact } from "@/core/resolver/impacts/inboxImpacts";
import { rngForRace } from "@/services/race/raceSimulationService";
import { generateUUID } from "@/core/uuid";

/**
 * Gate Draw Phase (Order 66)
 * Assigns gate numbers to race entries at a configurable lead time before race day.
 * G1 races: draw 5 days before, send inbox email with full draw results.
 * Other races: draw 2 days before, no notification.
 */
export const gateDrawPhase: PipelinePhase = {
  name: "gateDraw",
  order: PHASE_ORDER_GATE_DRAW,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, horseMap } = context;
    const impacts: AnyImpact[] = [];
    const races: Record<string, Race> = { ...state.races };
    let racesChanged = false;

    for (const race of Object.values(races)) {
      if (race.resolved) continue;

      const drawLeadTime = race.graded?.grade === "G1" ? 5 : 2;
      const daysUntilRace = race.day - newDay;

      if (daysUntilRace !== drawLeadTime) continue;

      // Skip if all entries already have gates (idempotent)
      const hasUnassignedGates = race.entries.some((e) => e.gate === undefined);
      if (!hasUnassignedGates) continue;

      // Skip if no entries to draw for
      if (race.entries.length === 0) continue;

      // Create fresh RNG seeded by race ID for deterministic shuffling
      const rng = rngForRace(race);

      // Partition entries into pre-assigned and unassigned
      const preAssigned = race.entries.filter((e) => e.gate !== undefined);
      const unassigned = race.entries.filter((e) => e.gate === undefined);

      // Collect gates already taken
      const usedGates = new Set(preAssigned.map((e) => e.gate!));

      // Compute remaining gate numbers
      const totalEntries = race.entries.length;
      const remainingGates: number[] = [];
      for (let b = 1; b <= totalEntries; b++) {
        if (!usedGates.has(b)) {
          remainingGates.push(b);
        }
      }

      // Shuffle unassigned entries using Fisher-Yates
      const shuffled = [...unassigned];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Assign remaining gates to shuffled unassigned entries
      const updatedUnassigned = shuffled.map((entry, i) => ({
        ...entry,
        gate: remainingGates[i],
      }));

      // Merge pre-assigned and updated unassigned, preserving original order
      let unassignedIdx = 0;
      const updatedEntries = race.entries.map((entry) => {
        if (entry.gate !== undefined) {
          return entry;
        }
        return updatedUnassigned[unassignedIdx++];
      });

      races[race.id] = { ...race, entries: updatedEntries };
      racesChanged = true;

      // For G1 races: emit inbox email with full draw results
      if (race.graded?.grade === "G1") {
        const drawList = updatedEntries
          .map((e) => {
            const horse = horseMap.get(e.horseId);
            const horseName = horse?.name ?? `Horse ${e.horseId}`;
            return `Gate ${e.gate}: ${horseName}`;
          })
          .join("\n");

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "gateDraw",
          logLevel: "conditional",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "race",
            priority: "info",
            title: `Gate Draw: ${race.name}`,
            body: `The gate draw for ${race.name} has been completed.\n\n${drawList}`,
            cta: {
              label: "View Race",
              route: "race.$raceId",
              params: { raceId: race.id },
            },
          },
        } as InboxImpact);
      }
    }

    return {
      ...context,
      state: {
        ...state,
        races: racesChanged ? races : state.races,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
