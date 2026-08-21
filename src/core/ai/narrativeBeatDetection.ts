import type { Stable } from "@/game/types";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";
import type { NpcAIManager, StoryBeat } from "./npcCycleAI";
import { generateStoryBeat } from "./narrativeAI";

function addBeatToManager(manager: NpcAIManager, stableId: string, beat: StoryBeat): NpcAIManager {
  const state = manager.stableStates[stableId];
  if (!state?.narrativeState) return manager;

  return {
    ...manager,
    stableStates: {
      ...manager.stableStates,
      [stableId]: {
        ...state,
        narrativeState: {
          ...state.narrativeState,
          storyBeats: [...state.narrativeState.storyBeats, beat],
        },
      },
    },
  };
}

export function detectRaceBeats(
  manager: NpcAIManager,
  resolvedRaces: Race[],
  horseMap: Map<string, Horse>,
  day: number,
): NpcAIManager {
  let result = manager;

  for (const race of resolvedRaces) {
    if (!race.result || race.result.length === 0) continue;

    const winner = race.result.find((r) => r.position === 1);
    if (!winner) continue;

    const winnerHorse = horseMap.get(winner.horseId);
    if (!winnerHorse) continue;

    if (!winnerHorse || winnerHorse.ownership?.type !== "npc") continue;
    const winnerStableId = winnerHorse.ownership.stableId;

    const stableState = result.stableStates[winnerStableId];
    if (!stableState?.narrativeState) continue;

    if (race.graded?.grade === "G1") {
      const beat = generateStoryBeat(
        "g1_victory",
        day,
        `${winnerHorse.name} Triumphs in ${race.name}`,
        `${winnerHorse.name} delivered a stunning performance to win the ${race.graded.grade} ${race.name}, cementing their stable's reputation on the biggest stage.`,
      );
      result = addBeatToManager(result, winnerStableId, beat);
    }

    const fieldHorses = race.result
      .map((r) => horseMap.get(r.horseId))
      .filter((h): h is Horse => h !== undefined && h.id !== winnerHorse.id);
    if (fieldHorses.length >= 3) {
      const winnerRating =
        (winnerHorse.stats.speed +
          winnerHorse.stats.stamina +
          winnerHorse.stats.acceleration +
          winnerHorse.stats.consistency) /
        4;
      const fieldAvgRating =
        fieldHorses.reduce(
          (sum, h) =>
            sum +
            (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4,
          0,
        ) / fieldHorses.length;

      if (winnerRating < fieldAvgRating - 15) {
        const beat = generateStoryBeat(
          "upset",
          day,
          `Shock Result: ${winnerHorse.name} Stuns Field in ${race.name}`,
          `In a result few saw coming, ${winnerHorse.name} defied the odds to claim victory in ${race.name}, proving that heart and determination can overcome any disadvantage.`,
        );
        result = addBeatToManager(result, winnerStableId, beat);
      }
    }

    const recentWins = winnerHorse.raceHistory
      .filter((r) => r.position === 1)
      .sort((a, b) => b.day - a.day);
    if (recentWins.length >= 3) {
      const lastThreeWins = recentWins.slice(0, 3);
      const allRecentRaces = winnerHorse.raceHistory
        .filter((r) => r.day >= lastThreeWins[2].day)
        .sort((a, b) => a.day - b.day);
      const isStreak = allRecentRaces.length === 3 && allRecentRaces.every((r) => r.position === 1);
      if (isStreak) {
        const beat = generateStoryBeat(
          "winning_streak",
          day,
          `${winnerHorse.name} on a Three-Race Win Streak`,
          `${winnerHorse.name} continues their dominant run with a third consecutive victory in ${race.name}. The racing world is taking notice of this remarkable streak.`,
        );
        result = addBeatToManager(result, winnerStableId, beat);
      }
    }
  }

  return result;
}

export function detectDynastyBeats(
  manager: NpcAIManager,
  resolvedRaces: Race[],
  horseMap: Map<string, Horse>,
  day: number,
): NpcAIManager {
  let result = manager;

  for (const race of resolvedRaces) {
    if (!race.result || race.result.length === 0) continue;
    if (!race.graded) continue;

    const winner = race.result.find((r) => r.position === 1);
    if (!winner) continue;

    const winnerHorse = horseMap.get(winner.horseId);
    if (!winnerHorse || winnerHorse.ownership?.type !== "npc") continue;
    const winnerStableId = winnerHorse.ownership.stableId;

    const isHomebred =
      !!winnerHorse.sireId &&
      !!winnerHorse.damId &&
      winnerHorse.raceHistory.every((rh) => rh.stableId === winnerStableId);
    if (!isHomebred) continue;

    const stableState = result.stableStates[winnerStableId];
    if (!stableState?.narrativeState) continue;

    const homebredGradedWins = Array.from(horseMap.values()).filter(
      (h) =>
        h.ownership?.type === "npc" &&
        h.ownership.stableId === winnerStableId &&
        !!h.sireId &&
        !!h.damId &&
        h.raceHistory.some((rh) => rh.grade && rh.position === 1),
    ).length;

    if (homebredGradedWins >= 3) {
      const existingBeat = stableState.narrativeState.storyBeats.find(
        (b) => b.arcId === "dynasty" && b.day > day - 30,
      );
      if (!existingBeat) {
        const beat = generateStoryBeat(
          "dynasty",
          day,
          `Breeding Dynasty: ${homebredGradedWins} Homebred Graded Winners`,
          `The breeding program at this stable has produced ${homebredGradedWins} graded race winners, establishing a true dynasty in the making.`,
        );
        result = addBeatToManager(result, winnerStableId, beat);
      }
    }
  }

  return result;
}

export function detectComebackBeats(
  manager: NpcAIManager,
  resolvedRaces: Race[],
  horseMap: Map<string, Horse>,
  day: number,
): NpcAIManager {
  let result = manager;

  for (const race of resolvedRaces) {
    if (!race.result || race.result.length === 0) continue;

    const winner = race.result.find((r) => r.position === 1);
    if (!winner) continue;

    const winnerHorse = horseMap.get(winner.horseId);
    if (!winnerHorse || winnerHorse.ownership?.type !== "npc") continue;
    const winnerStableId = winnerHorse.ownership.stableId;

    const stableState = result.stableStates[winnerStableId];
    if (!stableState?.narrativeState) continue;

    const sortedHistory = [...winnerHorse.raceHistory].sort((a, b) => a.day - b.day);
    if (sortedHistory.length < 2) continue;

    const lastRace = sortedHistory[sortedHistory.length - 1];
    const prevRace = sortedHistory[sortedHistory.length - 2];
    const gap = lastRace.day - prevRace.day;

    if (winnerHorse.age >= 7 && gap >= 60 && lastRace.position === 1) {
      const beat = generateStoryBeat(
        "comeback",
        day,
        `Remarkable Comeback: ${winnerHorse.name} Returns to Win`,
        `After a ${gap}-day absence from the track, ${winnerHorse.age}-year-old ${winnerHorse.name} defied age and doubt to claim victory once more.`,
      );
      result = addBeatToManager(result, winnerStableId, beat);
    }
  }

  return result;
}

export function detectAllianceDramaBeats(manager: NpcAIManager, day: number): NpcAIManager {
  let result = manager;

  for (const [stableId, state] of Object.entries(manager.stableStates)) {
    if (!state.npcRelationships || !state.narrativeState) continue;

    for (const [otherId, rel] of Object.entries(state.npcRelationships)) {
      if (rel.trust <= -50 && rel.allianceType === null) {
        const hasRecentBetrayalBeat = state.narrativeState.storyBeats.some(
          (b) => b.arcId === "betrayal" && b.day > day - 30 && b.headline.includes(otherId),
        );
        if (!hasRecentBetrayalBeat) {
          const beat = generateStoryBeat(
            "betrayal",
            day,
            `Alliance Broken: ${stableId} Turns on ${otherId}`,
            `Trust between ${stableId} and ${otherId} has collapsed to ${rel.trust}, shattering their former alliance and sending shockwaves through the racing community.`,
          );
          result = addBeatToManager(result, stableId, beat);
        }
      }

      if (rel.trust >= 80 && rel.allianceType !== null) {
        const hasRecentAllianceBeat = state.narrativeState.storyBeats.some(
          (b) => b.arcId === "alliance_formed" && b.day > day - 30 && b.headline.includes(otherId),
        );
        if (!hasRecentAllianceBeat) {
          const beat = generateStoryBeat(
            "alliance_formed",
            day,
            `New Alliance: ${stableId} and ${otherId} Forge ${rel.allianceType} Pact`,
            `In a strategic move, ${stableId} and ${otherId} have formalized a ${rel.allianceType} agreement, reshaping the competitive landscape.`,
          );
          result = addBeatToManager(result, stableId, beat);
        }
      }
    }
  }

  return result;
}
