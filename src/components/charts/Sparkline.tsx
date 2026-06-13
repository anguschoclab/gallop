/**
 * Sparkline.tsx - Single-series sparkline (line or area) using Recharts.
 */
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { chartColors } from "./chartTheme";
import { useId } from "react";

interface SparklineProps {
  data: number[];
  variant?: "line" | "area";
  color?: string;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  variant = "area",
  color = chartColors.primary,
  height = 48,
  strokeWidth = 1.75,
}: SparklineProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `spark-grad-${id}`;
  const rows = data.map((v, i) => ({ i, v }));

  if (variant === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
