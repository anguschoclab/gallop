import { randomHorseName } from "@/game/names";

// Deterministic PRNG from a string seed (mulberry32 + simple hash)
function seedFrom(s: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nameFromSeed(seed: string): string {
  return randomHorseName(seedFrom(seed));
}

type Node = { name: string; sire?: Node; dam?: Node };

function build(name: string, depth: number, path: string): Node {
  if (depth === 0) return { name };
  return {
    name,
    sire: build(nameFromSeed(path + "|S"), depth - 1, path + "|S"),
    dam: build(nameFromSeed(path + "|D"), depth - 1, path + "|D"),
  };
}

function NodeView({ node, label }: { node: Node; label?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="rounded-md border bg-card px-2 py-1 text-xs">
        {label && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
            {label}
          </span>
        )}
        <span className="font-medium truncate">{node.name}</span>
      </div>
      {(node.sire || node.dam) && (
        <div className="ml-3 border-l pl-3 space-y-1">
          {node.sire && <NodeView node={node.sire} label="Sire" />}
          {node.dam && <NodeView node={node.dam} label="Dam" />}
        </div>
      )}
    </div>
  );
}

export function Lineage({
  horseId,
  horseName,
  sireName,
  damName,
  generations = 4,
}: {
  horseId: string;
  horseName: string;
  sireName?: string;
  damName?: string;
  generations?: number;
}) {
  const sireSeed = `${horseId}|sire`;
  const damSeed = `${horseId}|dam`;
  const sire = build(sireName ?? nameFromSeed(sireSeed), generations - 1, sireSeed);
  const dam = build(damName ?? nameFromSeed(damSeed), generations - 1, damSeed);
  const root: Node = { name: horseName, sire, dam };
  return <NodeView node={root} />;
}
