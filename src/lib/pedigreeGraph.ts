import { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
import { createRng, hashStr } from "@/game/rng";
import { computeCoiFromSnapshot, classifyCoi } from "@/core/breeding/populationGenetics";
import type { Horse } from "@/game/types";
import type { CoatColor } from "@/core/horse/types";
import type { Node, Edge } from "@xyflow/react";

export type PedigreeNodeData = {
  name: string;
  gender?: string;
  isReal: boolean;
  bestBeyer?: number;
  coatColor?: CoatColor;
  generation: number;
  isSire: boolean;
  horseId?: string;
  inbreedCount: number;
  ringColor?: string;
};

export type PedigreeNode = Node<PedigreeNodeData, "horse">;
export type PedigreeEdge = Edge;

const NODE_WIDTH = 150;
const NODE_HEIGHT = 72;

function phantomName(seed: string): string {
  const rng = createRng(hashStr(seed));
  return generateProceduralHorseName({ existingNames: new Set() }, rng, { strategy: "regional" });
}

function bestBeyer(horse: Horse): number | undefined {
  const figures = horse.raceHistory
    ?.map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");
  return figures && figures.length > 0 ? Math.max(...figures) : undefined;
}

type RawNode = {
  id: string;
  data: PedigreeNodeData;
  parentId?: string;
};

function walk(
  nodeId: string,
  name: string,
  horses: Horse[],
  generation: number,
  isSire: boolean,
  maxGen: number,
  path: string,
  occurrences: Map<string, number[]>,
  rawNodes: RawNode[],
  rawEdges: { source: string; target: string; id: string }[],
  parentId?: string,
) {
  const horse = horses.find((h) => h.id === nodeId);
  const isReal = !!horse;

  const data: PedigreeNodeData = {
    name,
    gender: horse?.gender,
    isReal,
    bestBeyer: horse ? bestBeyer(horse) : undefined,
    coatColor: horse?.coatColor,
    generation,
    isSire,
    horseId: isReal ? nodeId : undefined,
    inbreedCount: 0,
  };

  rawNodes.push({ id: nodeId, data, parentId });

  const gens = occurrences.get(nodeId) ?? [];
  gens.push(generation);
  occurrences.set(nodeId, gens);

  if (parentId) {
    rawEdges.push({ source: nodeId, target: parentId, id: `${nodeId}->${parentId}` });
  }

  if (generation >= maxGen) return;

  if (horse) {
    if (horse.sireId) {
      walk(
        horse.sireId,
        horse.sireName || phantomName(`${nodeId}|S`),
        horses,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    } else if (horse.sireName) {
      const phantomId = `phantom:${hashStr(`${nodeId}|S`)}`;
      walk(
        phantomId,
        horse.sireName,
        horses,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    } else {
      const phantomId = `phantom:${hashStr(`${path}|S`)}`;
      walk(
        phantomId,
        phantomName(`${path}|S`),
        horses,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    }

    if (horse.damId) {
      walk(
        horse.damId,
        horse.damName || phantomName(`${nodeId}|D`),
        horses,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    } else if (horse.damName) {
      const phantomId = `phantom:${hashStr(`${nodeId}|D`)}`;
      walk(
        phantomId,
        horse.damName,
        horses,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    } else {
      const phantomId = `phantom:${hashStr(`${path}|D`)}`;
      walk(
        phantomId,
        phantomName(`${path}|D`),
        horses,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        nodeId,
      );
    }
  } else {
    const sirePhantomId = `phantom:${hashStr(`${path}|S`)}`;
    walk(
      sirePhantomId,
      phantomName(`${path}|S`),
      horses,
      generation + 1,
      true,
      maxGen,
      `${path}|S`,
      occurrences,
      rawNodes,
      rawEdges,
      nodeId,
    );
    const damPhantomId = `phantom:${hashStr(`${path}|D`)}`;
    walk(
      damPhantomId,
      phantomName(`${path}|D`),
      horses,
      generation + 1,
      false,
      maxGen,
      `${path}|D`,
      occurrences,
      rawNodes,
      rawEdges,
      nodeId,
    );
  }
}

function ringColor(closestGap: number): string {
  if (closestGap <= 2) return "ring-red-500";
  if (closestGap <= 3) return "ring-orange-400";
  return "ring-yellow-400";
}

export function buildPedigreeGraph(
  horseId: string,
  horses: Horse[],
  maxGenerations: number,
): { nodes: PedigreeNode[]; edges: PedigreeEdge[]; coi: number; coiLabel: string } {
  const horse = horses.find((h) => h.id === horseId);
  if (!horse) return { nodes: [], edges: [], coi: 0, coiLabel: "" };

  const occurrences = new Map<string, number[]>();
  const rawNodes: RawNode[] = [];
  const rawEdges: { source: string; target: string; id: string }[] = [];

  walk(
    horseId,
    horse.name,
    horses,
    0,
    true,
    maxGenerations,
    horseId,
    occurrences,
    rawNodes,
    rawEdges,
    undefined,
  );

  // Deduplicate nodes (same id can appear multiple times via different paths)
  const seenIds = new Set<string>();
  const uniqueNodes = rawNodes.filter((n) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });

  // Deduplicate edges
  const seenEdgeIds = new Set<string>();
  const uniqueEdges = rawEdges.filter((e) => {
    if (seenEdgeIds.has(e.id)) return false;
    seenEdgeIds.add(e.id);
    return true;
  });

  // Mark inbreeding
  const inbreedingEdges: PedigreeEdge[] = [];
  for (const [id, gens] of occurrences) {
    if (gens.length < 2) continue;
    const node = uniqueNodes.find((n) => n.id === id);
    if (!node) continue;
    const sortedGens = [...gens].sort((a, b) => a - b);
    const closestGap = sortedGens[1] - sortedGens[0];
    node.data.inbreedCount = gens.length;
    node.data.ringColor = ringColor(closestGap);
    // Add a dashed edge between first and second occurrence positions
    const occurrenceNodes = rawNodes.filter((n) => n.id === id);
    if (occurrenceNodes.length >= 2 && occurrenceNodes[0].parentId && occurrenceNodes[1].parentId) {
      const edgeId = `inbreed:${id}`;
      if (!seenEdgeIds.has(edgeId)) {
        seenEdgeIds.add(edgeId);
        inbreedingEdges.push({
          id: edgeId,
          source: occurrenceNodes[0].parentId!,
          target: occurrenceNodes[1].parentId!,
          style: { strokeDasharray: "5 5", stroke: "#facc15", opacity: 0.5 },
          type: "straight",
          markerEnd: undefined,
        });
      }
    }
  }

  const coi = horse.coefficientOfInbreeding ?? computeCoiFromSnapshot(horse.pedigree as any);
  const coiLabel = coi > 0 ? `${(coi * 100).toFixed(1)}% COI · ${classifyCoi(coi)}` : "";

  const flowNodes: PedigreeNode[] = uniqueNodes.map((n) => ({
    id: n.id,
    type: "horse" as const,
    position: { x: 0, y: 0 },
    data: n.data,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    draggable: false,
  }));

  const flowEdges: PedigreeEdge[] = [
    ...uniqueEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep" as const,
      style: { stroke: "rgba(255,255,255,0.15)" },
    })),
    ...inbreedingEdges,
  ];

  return { nodes: flowNodes, edges: flowEdges, coi, coiLabel };
}

export function getAncestorIds(
  horseId: string,
  horses: Horse[],
  maxGenerations: number,
): Set<string> {
  const { nodes } = buildPedigreeGraph(horseId, horses, maxGenerations);
  return new Set(nodes.filter((n) => n.data.isReal && n.id !== horseId).map((n) => n.id));
}

export { NODE_WIDTH, NODE_HEIGHT };
