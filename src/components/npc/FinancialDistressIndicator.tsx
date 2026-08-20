import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FinancialDistressState, DistressLevel } from "@/core/ai/financialDistressAI";

interface FinancialDistressIndicatorProps {
  distress?: FinancialDistressState;
}

const LEVEL_CONFIG: Record<
  Exclude<DistressLevel, "healthy">,
  { icon: typeof AlertTriangle; color: string; border: string }
> = {
  caution: {
    icon: TrendingDown,
    color: "text-amber-400",
    border: "border-l-amber-400",
  },
  emergency: {
    icon: AlertTriangle,
    color: "text-orange-400",
    border: "border-l-orange-400",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-400",
    border: "border-l-red-400",
  },
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

export function FinancialDistressIndicator({ distress }: FinancialDistressIndicatorProps) {
  if (!distress || distress.level === "healthy") return null;

  const config = LEVEL_CONFIG[distress.level];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4",
        config.border,
      )}
    >
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
            config.color,
          )}
        >
          <Icon className="h-3 w-3" /> Financial Distress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
            Distress Level
          </span>
          <Badge
            className={cn(
              "rounded-none text-[9px] font-black uppercase tracking-widest border",
              distress.level === "critical"
                ? "bg-red-400/10 text-red-400 border-red-400/30"
                : distress.level === "emergency"
                  ? "bg-orange-400/10 text-orange-400 border-orange-400/30"
                  : "bg-amber-400/10 text-amber-400 border-amber-400/30",
            )}
          >
            {distress.level}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
            Days of Cash
          </span>
          <span className={cn("font-mono text-xs font-bold", config.color)}>
            {distress.daysOfCash}
          </span>
        </div>
        {distress.recommendedActions.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-cream/30">
              Recommended Actions
            </div>
            {distress.recommendedActions.map((action) => (
              <div
                key={action}
                className="text-[10px] font-mono text-cream/60 uppercase tracking-wide"
              >
                {formatAction(action)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
