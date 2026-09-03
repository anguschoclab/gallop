import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListOrdered } from "lucide-react";
import type { StrategicDirective } from "@/core/ai/strategicCoordinator";

interface StrategicDirectivesPanelProps {
  directives?: StrategicDirective[];
}

export function StrategicDirectivesPanel({ directives }: StrategicDirectivesPanelProps) {
  const sorted = [...(directives ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40 flex items-center gap-2">
          <ListOrdered className="h-3 w-3 text-blue-400" /> Strategic Directives
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic">
            No active directives
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((d, idx) => (
              <div
                key={`${d.type}-${idx}`}
                data-testid="directive-item"
                className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black font-mono text-cream/20 tabular-nums w-4">
                    {d.priority}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-white/10 text-cream/60 rounded-none font-mono text-[9px] uppercase tracking-wide"
                  >
                    {d.type.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400/60"
                      style={{ width: `${d.weight * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-cream/40 tabular-nums w-8 text-right">
                    {Math.round(d.weight * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
