/**
 * AreaTrend.tsx - Single-series area chart with axes + tooltip (modern-analytics look).
 */
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useId } from "react";
import { axisTickStyle, chartColors, gridStyle } from "./chartTheme";

interface AreaTrendProps {
  data: { x: number | string; y: number }[];
  color?: string;
  height?: number;
  yFormat?: (n: number) => string;
  xFormat?: (x: number | string) => string;
  showGrid?: boolean;
}

export function AreaTrend({
  data,
  color = chartColors.primary,
  height = 200,
  yFormat,
  xFormat,
  showGrid = true,
}: AreaTrendProps) {
  const gid = `area-${useId().replace(/:/g, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid ? <CartesianGrid {...gridStyle} vertical={false} /> : null}
        <XAxis
          dataKey="x"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={xFormat ? (v) => xFormat(v as number | string) : undefined}
          minTickGap={24}
        />
        <YAxis
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={yFormat}
        />
        <Tooltip
          cursor={{ stroke: chartColors.grid, strokeWidth: 1 }}
          contentStyle={{
            background: "var(--chart-tooltip-bg)",
            border: "1px solid color-mix(in oklab, var(--chart-1) 30%, transparent)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
          labelFormatter={xFormat ? (v) => xFormat(v as number | string) : undefined}
          formatter={(value: number) => [yFormat ? yFormat(value) : value, ""]}
        />
        <Area
          type="monotone"
          dataKey="y"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gid})`}
          activeDot={{ r: 3, fill: color, stroke: "var(--background)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
