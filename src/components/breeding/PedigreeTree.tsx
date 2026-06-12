import { useMemo, useState } from "react";
import { ReactFlow, Background, useNodesState, useEdgesState, type NodeTypes } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { useGame } from "@/game/store";
import { buildPedigreeGraph, NODE_WIDTH, NODE_HEIGHT } from "@/core/breeding/pedigreeGraph";
import { classifyCoi } from "@/core/breeding/populationGenetics";
import { PedigreeNodeCard } from "./PedigreeNodeCard";
import { cn } from "@/lib/cn";
import type { PedigreeFlowNode, PedigreeEdge } from "@/core/breeding/pedigreeGraph";

const nodeTypes: NodeTypes = {
  horse: PedigreeNodeCard as any,
};

function applyDagreLayout(nodes: PedigreeFlowNode[], edges: PedigreeEdge[]): PedigreeFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "RL", ranksep: 100, nodesep: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const positioned = g.node(node.id);
    if (!positioned) return node;
    return {
      ...node,
      position: {
        x: positioned.x - NODE_WIDTH / 2,
        y: positioned.y - NODE_HEIGHT / 2,
      },
    };
  });
}

interface PedigreeTreeProps {
  horseId: string;
  generations?: 3 | 4 | 5;
  sharedAncestorIds?: Set<string>;
  className?: string;
}

export function PedigreeTree({
  horseId,
  generations: initialGens = 4,
  sharedAncestorIds,
  className,
}: PedigreeTreeProps) {
  const [generations, setGenerations] = useState<3 | 4 | 5>(initialGens);
  const horseMap = useGame((s) => s.horseMap);

  const { rawNodes, rawEdges, coi, coiLabel } = useMemo(() => {
    const graph = buildPedigreeGraph(horseId, horseMap, generations);
    // Apply shared ancestor highlighting from breeding view
    const nodes = sharedAncestorIds
      ? graph.nodes.map((n) => {
          const actualHorseId = n.id.split(":")[0];
          return sharedAncestorIds.has(actualHorseId)
            ? {
                ...n,
                data: {
                  ...n.data,
                  inbreedCount: Math.max(n.data.inbreedCount, 2),
                  ringColor: "ring-blue-400",
                },
              }
            : n;
        })
      : graph.nodes;
    return { rawNodes: nodes, rawEdges: graph.edges, coi: graph.coi, coiLabel: graph.coiLabel };
  }, [horseId, horseMap, generations, sharedAncestorIds]);

  const layoutNodes = useMemo(() => applyDagreLayout(rawNodes, rawEdges), [rawNodes, rawEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  // Sync state when layoutNodes or rawEdges change
  useMemo(() => {
    setNodes(layoutNodes);
    setEdges(rawEdges);
  }, [layoutNodes, rawEdges, setNodes, setEdges]);

  const coiColor = coi > 0.05 ? "text-destructive" : coi > 0.02 ? "text-warning" : "text-cream/40";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {([3, 4, 5] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenerations(g)}
              className={cn(
                "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-colors",
                generations === g
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "text-cream/30 hover:text-cream/60 border border-white/5",
              )}
            >
              {g} Gen
            </button>
          ))}
        </div>

        {coiLabel && (
          <span className={cn("text-[9px] font-mono uppercase tracking-wide", coiColor)}>
            {coiLabel}
          </span>
        )}
      </div>

      <div className="h-[500px] rounded-sm border border-white/5 overflow-hidden bg-slate-950/60">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          minZoom={0.3}
          maxZoom={2}
          colorMode="dark"
        >
          <Background color="rgba(255,255,255,0.03)" gap={20} />
        </ReactFlow>
      </div>
    </div>
  );
}
