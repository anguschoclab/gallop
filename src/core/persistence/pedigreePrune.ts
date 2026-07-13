/**
 * pedigreePrune.ts - Cap pedigree tree depth for persistence.
 *
 * The PedigreeNode structure is recursive (sirePedigree / damPedigree) and grows
 * by one level per generation. This module prunes trees to a fixed depth before
 * persistence and provides a runtime helper to re-expand stubs on demand.
 */

import type { PedigreeNode } from "@/core/breeding/types";
import type { Horse } from "@/core/horse/types";

export const MAX_PERSISTED_PEDIGREE_DEPTH = 4;

/**
 * Prune a pedigree tree to a maximum depth, replacing deeper nodes with stubs.
 *
 * Stubs preserve `horseId`, `name`, `sireId`, `damId`, `sireName`, `damName`
 * so that display and parent-lookup still work. The `isStub` flag marks them.
 *
 * @param node - The root pedigree node (generation 0)
 * @param maxDepth - Maximum depth to preserve (default: MAX_PERSISTED_PEDIGREE_DEPTH)
 * @returns A new pruned PedigreeNode
 */
export function prunePedigree(
  node: PedigreeNode | undefined,
  maxDepth: number = MAX_PERSISTED_PEDIGREE_DEPTH,
): PedigreeNode | undefined {
  if (!node) return undefined;

  // At max depth, create a stub that preserves IDs/names but drops nested trees
  if (node.generation >= maxDepth) {
    return {
      horseId: node.horseId,
      name: node.name,
      generation: node.generation,
      sireId: node.sireId,
      damId: node.damId,
      sireName: node.sireName,
      damName: node.damName,
      aptitudinalGroup: node.aptitudinalGroup,
      isStub: true,
    };
  }

  return {
    ...node,
    sirePedigree: prunePedigree(node.sirePedigree, maxDepth),
    damPedigree: prunePedigree(node.damPedigree, maxDepth),
    isStub: false,
  };
}

/**
 * Expand stub nodes in a pruned pedigree tree using a horse resolver.
 *
 * When a view needs a deeper pedigree tree than what was persisted, this function
 * walks the tree and replaces `isStub` nodes with the full pedigree from the
 * resolved horse. Expansion is recursive so resolving a stub can reveal further
 * ancestors.
 *
 * @param node - The pedigree node (possibly containing stubs)
 * @param resolveHorse - Function that returns a Horse by ID, or undefined
 * @param maxExpandDepth - Safety limit on expansion depth (default: 10)
 * @returns A new PedigreeNode with stubs expanded where possible
 */
export function expandPedigreeStubs(
  node: PedigreeNode | undefined,
  resolveHorse: (id: string) => Horse | undefined,
  maxExpandDepth: number = 10,
): PedigreeNode | undefined {
  if (!node) return undefined;

  if (node.isStub && node.horseId) {
    const horse = resolveHorse(node.horseId);
    if (horse?.pedigree) {
      // Replace stub with the horse's actual pedigree, then continue expanding
      return expandPedigreeStubs(
        { ...horse.pedigree, generation: node.generation },
        resolveHorse,
        maxExpandDepth - 1,
      );
    }
    // Can't resolve — return the stub as-is
    return node;
  }

  if (maxExpandDepth <= 0) return node;

  return {
    ...node,
    sirePedigree: expandPedigreeStubs(node.sirePedigree, resolveHorse, maxExpandDepth - 1),
    damPedigree: expandPedigreeStubs(node.damPedigree, resolveHorse, maxExpandDepth - 1),
  };
}

/**
 * Count the maximum depth of a pedigree tree.
 *
 * @param node - The root pedigree node
 * @returns Maximum depth (0 for a node with no parents, 1 for one level, etc.)
 */
export function pedigreeDepth(node: PedigreeNode | undefined): number {
  if (!node) return 0;
  if (!node.sirePedigree && !node.damPedigree) return 0;
  const sireDepth = node.sirePedigree ? pedigreeDepth(node.sirePedigree) : 0;
  const damDepth = node.damPedigree ? pedigreeDepth(node.damPedigree) : 0;
  return 1 + Math.max(sireDepth, damDepth);
}

/**
 * Count stub nodes in a pedigree tree.
 *
 * @param node - The root pedigree node
 * @returns Number of stub nodes found
 */
export function countStubs(node: PedigreeNode | undefined): number {
  if (!node) return 0;
  let count = node.isStub ? 1 : 0;
  if (!node.isStub) {
    count += countStubs(node.sirePedigree);
    count += countStubs(node.damPedigree);
  }
  return count;
}
