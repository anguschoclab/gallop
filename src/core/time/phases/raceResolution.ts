import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, RaceResultImpact, EnergyImpact, FormImpact, FameImpact, RaceHistoryImpact, CashImpact, BlueHenImpact, StudCareerImpact, PaceSampleImpact, JockeyStatsImpact, LogImpact, ClaimingImpact } from "@/core/resolver/impacts";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import { beyerFigure } from "@/game/beyer";
import { calculateClassBonus } from "@/core/common/classBonus";
import { detectInbreedingPattern, inbreedingPerformanceDampener } from "@/core/breeding/populationGenetics";
import type { Race, Horse } from "@/game/types";
import { getCurrentYear } from "@/game/raceSchedule";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { processClaims, type ClaimAttempt } from "@/game/claiming";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates all race resolution impacts.
 * This replaces the old resolveRace function with impact-based resolution.
 */
export const raceResolutionPhase: PipelinePhase = {
  name: "raceResolution",
  order: 70,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Find unresolved races that should be resolved today
    const overdueRaces = state.races.filter((r) => !r.resolved && r.day <= newDay);

    for (const race of overdueRaces) {
      // Simulate race
      const { runners, fillerHorses } = buildRaceField({ race, horses: state.horses, jockeys: state.jockeys ?? [] });
      const rng = rngForRace(race);
      const course = getCourseForRace(race);
      const result = runRaceToCompletion(runners, race.distance, rng, 0.1, 600, course);

      const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
      const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];

      // Generate race result impact
      impacts.push({
        id: crypto.randomUUID(),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "race_result",
        raceId: race.id,
        results: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
        reason: "Race resolved",
      } as RaceResultImpact);

      // Generate per-horse impacts
      for (const r of result) {
        const horse = state.horses.find((h) => h.id === r.horseId);
        if (!horse) continue;

        const runner = runners.find((run) => run.horseId === r.horseId);

        // Energy impact (-25)
        impacts.push({
          id: crypto.randomUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "energy_change",
          horseId: horse.id,
          delta: -25,
          reason: "Race energy expenditure",
        } as EnergyImpact);

        // Form impact based on position
        const formDelta = r.position === 1 ? 3 : r.position === 2 ? 2 : r.position === 3 ? 1 : r.position <= 5 ? 0 : -1;
        impacts.push({
          id: crypto.randomUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "form_change",
          horseId: horse.id,
          delta: formDelta,
          reason: `Race position: ${r.position}`,
        } as FormImpact);

        // Fame impact based on position
        const fameDelta = r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0;
        if (fameDelta > 0) {
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "fame_change",
            horseId: horse.id,
            delta: fameDelta,
            reason: `Race position: ${r.position}`,
          } as FameImpact);
        }

        // Beyer calculation with inbreeding dampener
        const beyer = beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
        const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
        const dampener = inbreedingPerformanceDampener(inbreedingPattern);
        const adjustedBeyer = Math.max(0, beyer - dampener);

        // Win and You're In qualification
        let winAndYouInQualified = undefined;
        if (r.position === 1 && race.graded?.winAndYouInTarget) {
          const currentYear = getCurrentYear(newDay);
          winAndYouInQualified = { year: currentYear, raceId: race.id, raceKey: race.graded.winAndYouInTarget };
        }

        // Race history impact
        impacts.push({
          id: crypto.randomUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "race_history",
          horseId: horse.id,
          raceHistoryEntry: {
            raceId: race.id,
            raceName: race.name,
            position: r.position,
            day: newDay,
            beyer: adjustedBeyer,
            grade: race.graded?.grade,
            distance: race.distance,
            surface: race.graded?.surface,
            purse: race.purse,
            fieldSize: result.length,
            raceClass: race.raceClass,
            barrier: runner?.barrier,
            lane: runner?.lane,
            winAndYouInQualified,
          },
          reason: "Race completed",
        } as RaceHistoryImpact);

        // Prize money impact
        if (r.position - 1 < PRIZE_SPLIT.length) {
          const prize = Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
          if (prize > 0) {
            if (horse.stableId) {
              // NPC stable gets prize money
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: horse.stableId,
                amount: prize,
                reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
              } as CashImpact);
            } else {
              // Player gets prize money
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: "",
                amount: prize,
                reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
              } as CashImpact);
            }
          }
        }

        // Jockey riding fee deduction
        const entry = race.entries.find((e) => e.horseId === horse.id);
        if (entry?.jockeyId) {
          const jockey = state.jockeys?.find((j) => j.id === entry.jockeyId);
          if (jockey) {
            const ridingFee = jockey.ridingFee || 100; // Default $100 if not set
            if (horse.stableId) {
              // Deduct from NPC stable
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: horse.stableId,
                amount: -ridingFee,
                reason: `Jockey fee: ${jockey.name}`,
              } as CashImpact);
            } else {
              // Deduct from player
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: "",
                amount: -ridingFee,
                reason: `Jockey fee: ${jockey.name}`,
              } as CashImpact);
            }
          }
        }

        // Blue hen impact for graded stakes winners
        if (r.position === 1 && (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
          const dam = state.horses.find((h) => h.id === horse.pedigree?.damId);
          if (dam) {
            impacts.push({
              id: crypto.randomUUID(),
              intentId: "",
              day: newDay,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "blue hen_status",
              horseId: dam.id,
              blueHenStatus: {
                isBlueHen: dam.blueHenStatus?.isBlueHen || false,
                stakesWinnersProduced: (dam.blueHenStatus?.stakesWinnersProduced ?? 0) + 1,
                group1WinnersProduced: race.graded?.grade === "G1" ? (dam.blueHenStatus?.group1WinnersProduced ?? 0) + 1 : dam.blueHenStatus?.group1WinnersProduced,
                blueHenScore: dam.blueHenStatus?.blueHenScore || 0,
                foalsProduced: dam.blueHenStatus?.foalsProduced || 0,
              },
              reason: `Stakes win by ${horse.name}`,
            } as BlueHenImpact);
          }

          // Stud career impact for sire
          const sire = state.horses.find((h) => h.id === horse.pedigree?.sireId);
          if (sire && sire.stud?.atStud) {
            impacts.push({
              id: crypto.randomUUID(),
              intentId: "",
              day: newDay,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "stud_career",
              horseId: sire.id,
              studCareer: {
                atStud: sire.stud.atStud,
                standingFee: sire.stud.standingFee,
                bookSize: sire.stud.bookSize,
                seasonBookings: sire.stud.seasonBookings,
                lifetimeFoals: sire.stud.lifetimeFoals,
                lifetimeStakesFoals: (sire.stud.lifetimeStakesFoals ?? 0) + 1,
                lifetimeG1Foals: race.graded?.grade === "G1" ? (sire.stud.lifetimeG1Foals ?? 0) + 1 : sire.stud.lifetimeG1Foals,
              },
              reason: `Stakes win by ${horse.name}`,
            } as StudCareerImpact);
          }
        }

        // Jockey stats impact
        const raceEntry = race.entries.find((e) => e.horseId === horse.id);
        if (raceEntry?.jockeyId && r.position - 1 < PRIZE_SPLIT.length) {
          const jockey = state.jockeys?.find((j) => j.id === raceEntry.jockeyId);
          if (jockey) {
            const winAmount = PRIZE_SPLIT[r.position - 1] * race.purse;
            const jockeyFee = Math.round(winAmount * 0.1);

            impacts.push({
              id: crypto.randomUUID(),
              intentId: "",
              day: newDay,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "jockey_stats",
              jockeyId: jockey.id,
              careerStarts: jockey.careerStarts + 1,
              careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
              fame: Math.min(100, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
              reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
            } as JockeyStatsImpact);

            // Jockey fee impact
            if (jockeyFee > 0) {
              if (raceEntry.owned) {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: "",
                  amount: -jockeyFee,
                  reason: `Jockey fee for ${jockey.name}`,
                } as CashImpact);
              } else if (raceEntry.stableId) {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: raceEntry.stableId,
                  amount: -jockeyFee,
                  reason: `Jockey fee for ${jockey.name}`,
                } as CashImpact);
              }
            }
          }
        }
      }

      // Pace sample impact for winner
      if (result.length > 0) {
        const winner = result[0];
        impacts.push({
          id: crypto.randomUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "pace_sample",
          distance: race.distance,
          time: winner.time,
          reason: `Pace sample from ${race.name}`,
        } as PaceSampleImpact);
      }

      // Log impact for race summary
      const ownedHorses = result.filter((r) => {
        const horse = state.horses.find((h) => h.id === r.horseId);
        return horse && !horse.stableId;
      });
      if (ownedHorses.length > 0) {
        const summary = ownedHorses.map((r) => {
          const horse = state.horses.find((h) => h.id === r.horseId);
          return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
        }).join(", ");
        const prize = ownedHorses.reduce((sum, r) => {
          if (r.position - 1 < PRIZE_SPLIT.length) {
            return sum + Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
          }
          return sum;
        }, 0);
        impacts.push({
          id: crypto.randomUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "log",
          text: `${race.name} — ${summary}${prize > 0 ? ` (won $${prize.toLocaleString()})` : ""}`,
          reason: "Race summary",
        } as LogImpact);
      }

      // Claiming resolution (if race is claiming race)
      if (race.claimingPrice) {
        // Collect all ClaimingIntents for this race
        const claimIntents = context.intents.filter(
          (i): i is ClaimingIntent => i.type === "claiming" && i.raceId === race.id
        );
        
        if (claimIntents.length > 0) {
          // Filter out horses withdrawn from claiming
          const eligibleClaims = claimIntents.filter((claim) => {
            const entry = race.entries.find((e) => e.horseId === claim.horseId);
            return entry && !entry.withdrawnFromClaiming;
          });

          // Refund claimants for withdrawn horses
          const withdrawnClaims = claimIntents.filter((claim) => {
            const entry = race.entries.find((e) => e.horseId === claim.horseId);
            return entry && entry.withdrawnFromClaiming;
          });

          for (const withdrawnClaim of withdrawnClaims) {
            if (withdrawnClaim.claimantStableId) {
              impacts.push({
                id: crypto.randomUUID(),
                intentId: withdrawnClaim.id,
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: withdrawnClaim.claimantStableId,
                amount: withdrawnClaim.claimingPrice,
                reason: `Refund for withdrawn horse ${withdrawnClaim.horseId} in ${race.name}`,
              } as CashImpact);
            } else {
              impacts.push({
                id: crypto.randomUUID(),
                intentId: withdrawnClaim.id,
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "cash_change",
                entityId: "",
                amount: withdrawnClaim.claimingPrice,
                reason: `Refund for withdrawn horse ${withdrawnClaim.horseId} in ${race.name}`,
              } as CashImpact);
            }
            
            impacts.push({
              id: crypto.randomUUID(),
              intentId: withdrawnClaim.id,
              day: newDay,
              phase: "raceResolution",
              logLevel: "always",
              type: "log",
              text: `Claim on ${withdrawnClaim.horseId} in ${race.name} refunded (horse withdrawn from claiming)`,
              reason: "Claiming refund",
            } as LogImpact);
          }
          
          if (eligibleClaims.length > 0) {
            // Convert ClaimingIntents to ClaimAttempt format for processClaims
            const claimAttempts: ClaimAttempt[] = eligibleClaims.map((intent) => ({
              claimantStableId: intent.claimantStableId || "",
              horseId: intent.horseId,
              claimingPrice: intent.claimingPrice,
              successful: false,
            }));
            
            // Process claims using existing function
            const { transfers, logs: claimLogs } = processClaims(
              race,
              claimAttempts,
              state.horses,
              newDay,
              rng
            );
            
            // Generate impacts for transfers
            for (const transfer of transfers) {
              // ClaimingImpact for horse transfer
              impacts.push({
                id: crypto.randomUUID(),
                intentId: eligibleClaims.find((i) => i.horseId === transfer.horseId)?.id || "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "always",
                type: "claiming",
                raceId: race.id,
                horseId: transfer.horseId,
                fromStableId: transfer.fromStableId,
                toStableId: transfer.toStableId,
                claimingPrice: transfer.price,
                reason: `Claimed for $${transfer.price.toLocaleString()} after ${race.name}`,
              } as ClaimingImpact);
              
              // CashImpact for claimant (negative)
              if (transfer.toStableId) {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: transfer.toStableId,
                  amount: -transfer.price,
                  reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
                } as CashImpact);
              } else {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: "",
                  amount: -transfer.price,
                  reason: `Claiming payment for ${transfer.horseId} in ${race.name}`,
                } as CashImpact);
              }
              
              // CashImpact for original owner (positive)
              if (transfer.fromStableId) {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: transfer.fromStableId,
                  amount: transfer.price,
                  reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
                } as CashImpact);
              } else {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: "",
                  amount: transfer.price,
                  reason: `Claiming proceeds for ${transfer.horseId} in ${race.name}`,
                } as CashImpact);
              }
            }
            
            // Generate log impacts for claim results
            for (const log of claimLogs) {
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "always",
                type: "log",
                text: log,
                reason: "Claiming result",
              } as LogImpact);
            }
            
            // Refund losing claimants
            const winningHorseIds = new Set(transfers.map((t) => t.horseId));
            const losingClaims = eligibleClaims.filter(
              (i) => !winningHorseIds.has(i.horseId)
            );
            for (const losingClaim of losingClaims) {
              if (losingClaim.claimantStableId) {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: losingClaim.id,
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: losingClaim.claimantStableId,
                  amount: losingClaim.claimingPrice,
                  reason: `Refund for failed claim on ${losingClaim.horseId} in ${race.name}`,
                } as CashImpact);
              } else {
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: losingClaim.id,
                  day: newDay,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: "",
                  amount: losingClaim.claimingPrice,
                  reason: `Refund for failed claim on ${losingClaim.horseId} in ${race.name}`,
                } as CashImpact);
              }
            }
          }
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};

function getOrdinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}
