import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Jockey } from "@/game/types";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { User, Trophy, Calendar, DollarSign, Target, RefreshCw } from "lucide-react";
import { JockeyAvatar } from "./JockeyAvatar";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/lib/formatting";

interface JockeyCardProps {
  jockey: Jockey;
  isRetained?: boolean;
  onAction?: (jockey: Jockey) => void;
  actionLabel?: string;
}

export function JockeyCard({ jockey, isRetained, onAction, actionLabel }: JockeyCardProps) {
  const rerollJockeySilk = useGame((s) => s.rerollJockeySilk);

  const statsData = [
    { stat: "Pacing", value: jockey.stats.pacing },
    { stat: "Pos", value: jockey.stats.positioning },
    { stat: "Vigor", value: jockey.stats.vigor },
    { stat: "Gate", value: jockey.stats.gateSkill },
    { stat: "Temp", value: jockey.stats.temperament },
  ];

  const chartConfig = {
    value: {
      label: "Skill",
      color: "hsl(var(--primary))",
    },
  };

  const archetypeColors: Record<string, string> = {
    front_runner: "bg-chart-1/20 text-chart-1 border-chart-1/50",
    closer: "bg-chart-3/20 text-chart-3 border-chart-3/50",
    clinical: "bg-success/20 text-success border-success/50",
    finisher: "bg-destructive/20 text-destructive border-destructive/50",
    versatile: "bg-fame/20 text-fame border-fame/50",
  };

  const winRate = jockey.careerStarts > 0 ? (jockey.careerWins / jockey.careerStarts) * 100 : 0;

  return (
    <Card className="overflow-hidden border-gold-muted bg-gradient-to-br from-card to-card/50 hover:border-gold transition-all duration-300">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="relative">
              <JockeyAvatar jockey={jockey} size="md" />
              {isRetained && (
                <button
                  onClick={() => rerollJockeySilk(jockey.id)}
                  className="absolute -top-1 -right-1 bg-t700 hover:bg-t600 text-cream rounded-full p-1 shadow-md transition-all"
                  title="Reroll Silks"
                  aria-label={`Reroll silks for ${jockey.name}`}
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{jockey.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-black ${archetypeColors[jockey.archetype] || ""}`}
                >
                  {jockey.archetype.replace("_", " ")}
                </Badge>
                {isRetained && (
                  <Badge className="bg-t700 text-cream text-[10px] font-black uppercase">
                    Retained
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-gold">{formatCurrency(jockey.ridingFee)}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Mount Fee</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-2 border border-border">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                  <Trophy size={12} className="text-fame" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Wins</span>
                </div>
                <div className="text-sm font-bold tabular-nums">{jockey.careerWins}</div>
                <div className="text-[9px] text-muted-foreground tabular-nums">
                  {winRate.toFixed(1)}% Rate
                </div>
              </div>
              <div className="bg-muted rounded-lg p-2 border border-border">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                  <Calendar size={12} className="text-gold" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Age</span>
                </div>
                <div className="text-sm font-bold tabular-nums">{jockey.age}</div>
                <div className="text-[9px] text-muted-foreground uppercase font-medium">
                  Professional
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-2 border border-border">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Target size={12} className="text-warning" />
                <span className="text-[10px] font-black uppercase tracking-wider">Fame Index</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${jockey.fame}%` }} />
                </div>
                <span className="text-xs font-bold tabular-nums">{jockey.fame.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="h-32 w-32 -mr-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <RadarChart data={statsData} width={128} height={128}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="stat"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                />
                <Radar
                  name="Skill"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="var(--primary)"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ChartContainer>
          </div>
        </div>

        {onAction && (
          <button
            onClick={() => onAction(jockey)}
            className="w-full mt-4 py-2 bg-t700 text-cream text-xs font-black uppercase tracking-widest rounded-lg hover:bg-t600 transition-all flex items-center justify-center gap-2"
          >
            <DollarSign size={14} />
            {actionLabel || "Hire Jockey"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
