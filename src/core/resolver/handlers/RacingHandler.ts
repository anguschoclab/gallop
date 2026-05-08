import type { WritableDraft } from "immer/dist/internal";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

export class RacingHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "race_entry",
      "race_withdrawal",
      "race_result",
      "jockey_contract",
      "jockey_assignment",
      "jockey_stats",
      "race_history",
      "claiming",
      "triple_crown_progress"
    ].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void {
    switch (impact.type) {
      case "race_entry": {
        const { raceId, horseId, jockeyId, weight } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          race.entries.push({
            horseId,
            owned: false,
            jockeyId,
            weight,
          });
        }
        break;
      }

      case "race_withdrawal": {
        const { raceId, horseId } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          const index = race.entries.findIndex((e) => e.horseId === horseId);
          if (index !== -1) {
            race.entries.splice(index, 1);
          }
        }
        break;
      }

      case "race_result": {
        const { raceId, results } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          race.result = results;
          race.resolved = true;
        }
        break;
      }

      case "jockey_contract": {
        const { jockeyId, stableId, contractUntil } = impact;
        const jockey = draft.jockeys?.find((j) => j.id === jockeyId);
        if (jockey) {
          jockey.stableId = stableId;
          jockey.contractUntil = contractUntil;
        }
        break;
      }

      case "jockey_assignment": {
        const { raceId, horseId, jockeyId } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          const entry = race.entries.find((e) => e.horseId === horseId);
          if (entry) {
            entry.jockeyId = jockeyId;
          }
        }
        break;
      }

      case "jockey_stats": {
        const { jockeyId, careerStarts, careerWins, fame } = impact;
        const jockey = draft.jockeys?.find((j) => j.id === jockeyId);
        if (jockey) {
          jockey.careerStarts = careerStarts;
          jockey.careerWins = careerWins;
          jockey.fame = fame;
        }
        break;
      }

      case "race_history": {
        const { horseId, raceHistoryEntry } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.raceHistory.push(raceHistoryEntry);
        }
        break;
      }

      case "claiming": {
        const { horseId, toStableId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stableId = toStableId;
          horse.owned = !toStableId;
        }
        break;
      }

      case "triple_crown_progress": {
        const { horseId, triplecrownKey, year, legs, won } = impact;
        if (!draft.triplecrownHistory) draft.triplecrownHistory = [];
        const existing = draft.triplecrownHistory.find(
          (t) => t.horseId === horseId && t.triplecrownKey === triplecrownKey && t.year === year
        );
        if (existing) {
          existing.legs = legs;
          existing.won = won;
        } else {
          draft.triplecrownHistory.push({ horseId, triplecrownKey, year, legs, won });
        }
        break;
      }
    }
  }
}
