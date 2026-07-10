/**
 * lineageCrawler.ts - Multi-generational lineage analysis
 *
 * This file provides utilities for crawling the horse pedigree tree to calculate
 * the long-term influence of a founder (mare or sire) across multiple generations.
 *
 * Dependencies: @/game/types (Horse), @/core/horse/stats (getCareerStats), ./historyTypes (FounderRecord)
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import type { FounderRecord } from "./historyTypes";
import type { PedigreeNode } from "@/core/breeding/types";

export interface PedigreeFounderInfluence {
  name: string;
  influence: number;
}

/**
 * Calculate the multi-generational influence of a founder horse.
 *
 * Performs a breadth-first search to find all descendants up to a reasonable
 * generation depth and sums their achievements.
 *
 * @param founder - The horse to analyze as a founder
 * @param allHorses - The complete database of horses
 * @param currentDay - Current game day
 * @returns A FounderRecord summarizing the horse's historical impact
 */
export function computeFounderInfluence(
  founder: Horse,
  allHorses: Horse[],
  currentDay: number,
  horseMap?: Map<string, Horse>,
  parentToChildrenMap?: Map<string, string[]>
): FounderRecord {
  const descendants = new Set<string>();
  const queue: { id: string; gen: number }[] = [{ id: founder.id, gen: 0 }];
  let maxGen = 0;

  // Map of parentId -> childrenIds for fast lookup
  const parentToChildren = parentToChildrenMap || new Map<string, string[]>();
  if (!parentToChildrenMap) {
    for (const h of allHorses) {
      if (h.pedigree?.sireId) {
        const children = parentToChildren.get(h.pedigree.sireId) || [];
        children.push(h.id);
        parentToChildren.set(h.pedigree.sireId, children);
      }
      if (h.pedigree?.damId) {
        const children = parentToChildren.get(h.pedigree.damId) || [];
        children.push(h.id);
        parentToChildren.set(h.pedigree.damId, children);
      }
    }
  }

  let totalEarnings = 0;
  let stakesWinners = 0;
  let g1Winners = 0;
  let influenceScore = 0;

  const visited = new Set<string>([founder.id]);

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (gen > 0) {
      descendants.add(id);
      maxGen = Math.max(maxGen, gen);

      // Performance: use passed horseMap or find linearly
      const horse = horseMap ? horseMap.get(id) : allHorses.find((h) => h.id === id);
      if (horse) {
        const stats = getCareerStats(horse);
        totalEarnings += stats.earnings;
        if (stats.stakesWins > 0) stakesWinners++;
        if (stats.g1Wins > 0) g1Winners++;

        // Influence Score Calculation:
        // Base points for being a descendant + bonuses for quality
        influenceScore += 10; // Base presence
        influenceScore += stats.wins * 5;
        influenceScore += stats.stakesWins * 50;
        influenceScore += stats.g1Wins * 200;
        influenceScore += Math.floor(stats.earnings / 10000);
      }
    }

    // Add children to queue (limit depth to 15 generations to prevent infinite loops/bloat)
    if (gen < 15) {
      const children = parentToChildren.get(id) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ id: childId, gen: gen + 1 });
        }
      }
    }
  }

  return {
    horseId: founder.id,
    name: founder.name,
    influenceScore: Math.round(influenceScore),
    totalEarnings,
    stakesWinners,
    g1Winners,
    generationDepth: maxGen,
    descendantCount: descendants.size,
    lastUpdated: currentDay,
  };
}

/**
 * Identify potential "Founders" from a population of horses.
 *
 * Filters for horses that have reached a minimum threshold of immediate progeny
 * quality (e.g., Blue Hens or elite Sires).
 *
 * @param horses - Population of horses to analyze
 * @returns Array of horses identified as potential founders
 */
export function identifyFounders(horses: Horse[]): Horse[] {
  return horses.filter((h) => {
    // Elite sires or Blue Hens
    const isEliteSire =
      (h.gender === "colt" || h.gender === "horse") && h.progenyCount && h.progenyCount > 10;
    const isBlueHen = h.blueHenStatus?.isBlueHen;
    return isEliteSire || isBlueHen;
  });
}

/**
 * Traverses a pedigree tree to compute the relative influence of founder horses
 * (horses with no recorded parents in the tree).
 *
 * Influence is defined recursively: a horse passes 50% of its influence to its offspring.
 * So parents are 50%, grandparents 25%, great-grandparents 12.5%, etc.
 * @param tree
 */
export function computePedigreeFounderInfluence(
  tree: PedigreeNode,
): Map<string, PedigreeFounderInfluence> {
  const influenceMap = new Map<string, PedigreeFounderInfluence>();

  function traverse(node: PedigreeNode, currentWeight: number) {
    const hasSire = !!node.sirePedigree || !!node.sireName;
    const hasDam = !!node.damPedigree || !!node.damName;

    if (!hasSire && !hasDam) {
      // This is a founder (no recorded parents)
      if (node.name) {
        const existing = influenceMap.get(node.name) || { name: node.name, influence: 0 };
        existing.influence += currentWeight;
        influenceMap.set(node.name, existing);
      }
      return;
    }

    if (node.sirePedigree) {
      traverse(node.sirePedigree, currentWeight * 0.5);
    } else if (node.sireName) {
      // Missing pedigree object but has a name string
      const existing = influenceMap.get(node.sireName) || { name: node.sireName, influence: 0 };
      existing.influence += currentWeight * 0.5;
      influenceMap.set(node.sireName, existing);
    }

    if (node.damPedigree) {
      traverse(node.damPedigree, currentWeight * 0.5);
    } else if (node.damName) {
      // Missing pedigree object but has a name string
      const existing = influenceMap.get(node.damName) || { name: node.damName, influence: 0 };
      existing.influence += currentWeight * 0.5;
      influenceMap.set(node.damName, existing);
    }
  }

  // The root node itself is never a founder unless it has no parents.
  // We start traversal at the root.
  traverse(tree, 1.0);

  return influenceMap;
}
