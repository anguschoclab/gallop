/**
 * seedNewsGenerator.ts - Orchestrator for seed gazette news generation
 *
 * This file now delegates to individual slot builders in seedNewsSlots.ts
 * for modularity.
 */

import type { NewsItem } from "@/services/narrative/newsTypes";
import type { Race, Horse, Stable } from "@/game/types";
import type { PlayerProfile } from "@/core/stable/types";
import type { Rng } from "@/core/common/rng";
import {
  buildSeasonOpener,
  buildRivalIntros,
  buildPowerRankings,
  buildG1Spotlight,
  buildGradedPreview,
  buildBloodlineInsight,
  buildVeteranChampion,
} from "./seedNewsSlots";

export interface SeedGazetteResult {
  news: NewsItem[];
  introStableIds: string[];
}

/**
 * Generates the initial gazette news items for a new game.
 *
 * @param {Stable[]} npcStables - NPC stables for rival introductions.
 * @param {Horse[]} npcHorses - NPC horses for power rankings and bloodline insights.
 * @param {Race[]} races - Scheduled races for G1 spotlight and graded preview.
 * @param {PlayerProfile | undefined} playerProfile - Player's stable profile for season opener.
 * @param {Rng} rng - Seeded random number generator.
 * @returns {SeedGazetteResult} Generated news items and intro stable IDs.
 */
export function seedGazetteNews(
  npcStables: Stable[],
  npcHorses: Horse[],
  races: Race[],
  playerProfile: PlayerProfile | undefined,
  rng: Rng,
): SeedGazetteResult {
  const news: NewsItem[] = [];
  const introStableIds: string[] = [];
  const day = 1;

  // Slot A — Season Opener
  const seasonOpener = buildSeasonOpener(playerProfile, day, rng);
  if (seasonOpener) news.push(seasonOpener);

  // Slot B — Rival Intros
  const rivalIntros = buildRivalIntros(npcStables, day, rng);
  for (const intro of rivalIntros) {
    news.push(intro.news);
    introStableIds.push(intro.stableId);
  }

  // Slot C — Power Rankings
  const powerRankings = buildPowerRankings(npcHorses, day, rng);
  if (powerRankings) news.push(powerRankings);

  // Slot D — G1 Spotlight
  const g1Spotlight = buildG1Spotlight(races, day, rng);
  if (g1Spotlight) news.push(g1Spotlight);

  // Slot E — Graded Preview
  const g1Day = g1Spotlight?.entityLinks?.find((el) => el.type === "race");
  const g1Race = g1Day ? races.find((r) => r.id === g1Day.id) : undefined;
  const gradedPreview = buildGradedPreview(races, g1Race?.day ?? 0, day, rng);
  if (gradedPreview) news.push(gradedPreview);

  // Slot F — Bloodline Insight
  const bloodlineInsight = buildBloodlineInsight(npcHorses, day, rng);
  if (bloodlineInsight) news.push(bloodlineInsight);

  // Slot G — Veteran Champion
  const veteranChampion = buildVeteranChampion(npcHorses, day, rng);
  if (veteranChampion) news.push(veteranChampion);

  return { news, introStableIds };
}
