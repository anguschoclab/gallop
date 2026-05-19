import { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
import { createRng, hashStr } from "@/game/rng";
import { computeCoiFromSnapshot, classifyCoi } from "@/core/breeding/populationGenetics";
import type { Horse } from "@/core/horse/types";
import type { CoatColor } from "@/core/horse/types";
import type { Node, Edge } from "@xyflow/react";

export type PedigreeFlowNodeData = {
  name: string;
  gender?: string;
  isReal: boolean;
  bestBeyer?: number;
  coatColor?: CoatColor;
  generation: number;
  isSire: boolean;
  horseId?: string;
  birthYear?: number;
  inbreedCount: number;
  ringColor?: string;
};

export type PedigreeFlowNode = Node<PedigreeFlowNodeData, "horse">;
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

function getBirthYear(birthDay: number): number {
  return Math.floor(birthDay / 365) + 1;
}

type RawNode = {
  id: string;
  data: PedigreeFlowNodeData;
  parentId?: string;
};

function walk(
  nodeId: string,
  name: string,
  horseMap: Map<string, Horse>,
  generation: number,
  isSire: boolean,
  maxGen: number,
  path: string,
  occurrences: Map<string, number[]>,
  rawNodes: RawNode[],
  rawEdges: { source: string; target: string; id: string }[],
  parentId?: string,
) {
  const horse = horseMap.get(nodeId);
  const isReal = !!horse;

  const data: PedigreeFlowNodeData = {
    name,
    gender: horse?.gender,
    isReal,
    bestBeyer: horse ? bestBeyer(horse) : undefined,
    coatColor: horse?.coatColor,
    generation,
    isSire,
    horseId: isReal ? nodeId : undefined,
    birthYear: horse ? getBirthYear(horse.birthDay) : undefined,
    inbreedCount: 0,
  };

  // Create a unique instance ID for the node in the graph, 
  // but track occurrences by the actual horseId (nodeId).
  const instanceId = `${nodeId}:${path}`;
  rawNodes.push({ id: instanceId, data, parentId });

  const gens = occurrences.get(nodeId) ?? [];
  gens.push(generation);
  occurrences.set(nodeId, gens);

  if (parentId) {
    rawEdges.push({ source: instanceId, target: parentId, id: `${instanceId}->${parentId}` });
  }

  if (generation >= maxGen) return;

  if (horse) {
    // Sire side
    const sireName = horse.sireName || horse.pedigree.sireName;
    const sireId = horse.sireId || horse.pedigree.sireId;
    
    if (sireId) {
      walk(
        sireId,
        sireName || phantomName(`${nodeId}|S`),
        horseMap,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    } else if (sireName) {
      const phantomId = `phantom:${hashStr(`${nodeId}|S`)}`;
      walk(
        phantomId,
        sireName,
        horseMap,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    } else {
      const phantomId = `phantom:${hashStr(`${path}|S`)}`;
      walk(
        phantomId,
        phantomName(`${path}|S`),
        horseMap,
        generation + 1,
        true,
        maxGen,
        `${path}|S`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    }

    // Dam side
    const damName = horse.damName || horse.pedigree.damName;
    const damId = horse.damId || horse.pedigree.damId;

    if (damId) {
      walk(
        damId,
        damName || phantomName(`${nodeId}|D`),
        horseMap,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    } else if (damName) {
      const phantomId = `phantom:${hashStr(`${nodeId}|D`)}`;
      walk(
        phantomId,
        damName,
        horseMap,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    } else {
      const phantomId = `phantom:${hashStr(`${path}|D`)}`;
      walk(
        phantomId,
        phantomName(`${path}|D`),
        horseMap,
        generation + 1,
        false,
        maxGen,
        `${path}|D`,
        occurrences,
        rawNodes,
        rawEdges,
        instanceId,
      );
    }
  } else {
    // If not a real horse, still generate phantom ancestors up to maxGen
    const sirePhantomId = `phantom:${hashStr(`${path}|S`)}`;
    walk(
      sirePhantomId,
      phantomName(`${path}|S`),
      horseMap,
      generation + 1,
      true,
      maxGen,
      `${path}|S`,
      occurrences,
      rawNodes,
      rawEdges,
      instanceId,
    );
    const damPhantomId = `phantom:${hashStr(`${path}|D`)}`;
    walk(
      damPhantomId,
      phantomName(`${path}|D`),
      horseMap,
      generation + 1,
      false,
      maxGen,
      `${path}|D`,
      occurrences,
      rawNodes,
      rawEdges,
      instanceId,
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
  horseMap: Map<string, Horse>,
  maxGenerations: number,
): { nodes: PedigreeFlowNode[]; edges: PedigreeEdge[]; coi: number; coiLabel: string } {
  const horse = horseMap.get(horseId);
  if (!horse) return { nodes: [], edges: [], coi: 0, coiLabel: "" };

  const occurrences = new Map<string, number[]>();
  const rawNodes: RawNode[] = [];
  const rawEdges: { source: string; target: string; id: string }[] = [];

  walk(
    horseId,
    horse.name,
    horseMap,
    0,
    true,
    maxGenerations,
    "root",
    occurrences,
    rawNodes,
    rawEdges,
    undefined,
  );

  // Inbreeding visualization: highlight nodes that appear multiple times
  for (const [id, gens] of occurrences) {
    if (gens.length < 2) continue;
    const sortedGens = [...gens].sort((a, b) => a - b);
    const closestGap = sortedGens[1] - sortedGens[0];
    const color = ringColor(closestGap);
    
    // Mark all instances of this horse in the graph
    rawNodes.forEach(n => {
      if (n.id.startsWith(`${id}:`)) {
        n.data.inbreedCount = gens.length;
        n.data.ringColor = color;
      }
    });
  }

  const coi = horse.coefficientOfInbreeding ?? computeCoiFromSnapshot(horse.pedigree as any);
  const coiLabel = coi > 0 ? `${(coi * 100).toFixed(1)}% COI · ${classifyCoi(coi)}` : "";

  const flowNodes: PedigreeFlowNode[] = rawNodes.map((n) => ({
    id: n.id,
    type: "horse" as const,
    position: { x: 0, y: 0 },
    data: n.data,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    draggable: false,
  }));

  const flowEdges: PedigreeEdge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep" as const,
    style: { stroke: "rgba(255,255,255,0.15)" },
  }));

  return { nodes: flowNodes, edges: flowEdges, coi, coiLabel };
}

export function getAncestorIds(
  horseId: string,
  horseMap: Map<string, Horse>,
  maxGenerations: number,
): Set<string> {
  const { nodes } = buildPedigreeGraph(horseId, horseMap, maxGenerations);
  return new Set(nodes.filter((n) => n.data.isReal && !n.id.startsWith(`${horseId}:`)).map((n) => n.id.split(":")[0]));
}

export { NODE_WIDTH, NODE_HEIGHT };

