import { JargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import { cn } from "@/shared/lib/cn";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface BeyerSparklineProps {
  data: Array<{ beyer: number }>;
  className?: string;
}

export function BeyerSparkline({ data, className }: BeyerSparklineProps) {
  if (data.length < 2) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex-1 min-h-[60px] relative bg-black/20 border border-white/5 rounded-sm p-1",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
          <Line
            type="step"
            dataKey="beyer"
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={{ r: 1.5, fill: "var(--background)", stroke: "var(--primary)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute top-1 left-1.5 text-[8px] font-mono text-primary/40">
        <JargonTooltip term="Beyer">BEYER</JargonTooltip>
      </div>
      <div className="absolute bottom-1 right-1.5 text-[9px] font-mono font-black text-primary">
        {data[data.length - 1].beyer}
      </div>
    </div>
  );
}
