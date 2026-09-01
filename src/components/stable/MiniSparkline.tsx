/**
 * MiniSparkline.tsx - Pure-SVG sparkline for card-level trends
 *
 * Avoids recharts overhead so the stable directory (which may render 50+ cards)
 * doesn't spawn dozens of recharts instances. Uses a simple SVG polyline.
 *
 * Dependencies: none
 * Related files: ./CashPressureTrend.tsx (consumer)
 */

interface MiniSparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

/**
 * Render a pure-SVG sparkline polyline. Returns null when data has fewer than
 * 2 points (not enough to draw a line).
 */
export function MiniSparkline({ data, color, height = 20, width = 60 }: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
