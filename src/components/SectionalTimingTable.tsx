import type { SectionalSplit } from "@/core/race/types";

interface SectionalTimingTableProps {
  splits: SectionalSplit[];
  runners: Array<{ horseId: string; name: string; silk: string; owned: boolean }>;
  distance: number;
}

export function SectionalTimingTable({ splits, runners, distance }: SectionalTimingTableProps) {
  const quarterMile = 402.336;
  const numQuarters = Math.floor(distance / quarterMile);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-2 font-mono">Quarter</th>
            <th className="text-left py-2 px-2 font-mono">Time</th>
            <th className="text-left py-2 px-2 font-mono">Leader</th>
            <th className="text-left py-2 px-2 font-mono">Positions</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => {
            const leader = runners.find(r => r.horseId === split.leader);
            return (
              <tr key={split.quarter} className="border-b border-white/5">
                <td className="py-2 px-2 font-mono">Q{split.quarter} ({split.quarter * quarterMile}m)</td>
                <td className="py-2 px-2 font-mono tabular-nums">{split.time.toFixed(2)}s</td>
                <td className="py-2 px-2 font-bold">{leader?.name || "Unknown"}</td>
                <td className="py-2 px-2 font-mono tabular-nums">
                  {split.positions.map(p => p.position).join("-")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
