import type { ReactNode } from "react";
import type { AwardRegion } from "@/core/awards/types";

export interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export interface RegionAwardColorScheme {
  primary: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  circleStroke: string;
}

export interface RegionAwardConfig {
  category: RegionAwardColorScheme;
  hoty: RegionAwardColorScheme;
}

export const REGION_AWARD_CONFIG: Record<AwardRegion, RegionAwardConfig> = {
  asia_pacific: {
    category: {
      primary: "#006400",
      accent: "#FFD700",
      gradientFrom: "#006400",
      gradientTo: "#004d00",
      circleStroke: "#32CD32",
    },
    hoty: {
      primary: "#006400",
      accent: "#FFD700",
      gradientFrom: "#006400",
      gradientTo: "#004d00",
      circleStroke: "#FFD700",
    },
  },
  europe: {
    category: {
      primary: "#4B0082",
      accent: "#C0C0C0",
      gradientFrom: "#4B0082",
      gradientTo: "#2D0052",
      circleStroke: "#7B68EE",
    },
    hoty: {
      primary: "#4B0082",
      accent: "#C0C0C0",
      gradientFrom: "#4B0082",
      gradientTo: "#2D0052",
      circleStroke: "#C0C0C0",
    },
  },
  north_america: {
    category: {
      primary: "#1E3A5F",
      accent: "#C0C0C0",
      gradientFrom: "#1E3A5F",
      gradientTo: "#0D2137",
      circleStroke: "#4A90A4",
    },
    hoty: {
      primary: "#1E3A5F",
      accent: "#C9A227",
      gradientFrom: "#1E3A5F",
      gradientTo: "#0D2137",
      circleStroke: "#C9A227",
    },
  },
  south_america: {
    category: {
      primary: "#8B0000",
      accent: "#FFD700",
      gradientFrom: "#8B0000",
      gradientTo: "#5C0000",
      circleStroke: "#FF6347",
    },
    hoty: {
      primary: "#8B0000",
      accent: "#FFD700",
      gradientFrom: "#8B0000",
      gradientTo: "#5C0000",
      circleStroke: "#FFD700",
    },
  },
};

export function AwardSvgShell({
  width,
  height,
  className,
  title,
  gradientId,
  colors,
  children,
}: SvgProps & {
  title: string;
  gradientId: string;
  colors: RegionAwardColorScheme;
  children: ReactNode;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{title}</title>
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke={colors.circleStroke}
        strokeWidth="2"
      />
      {children}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor={colors.gradientFrom} />
          <stop offset="100%" stopColor={colors.gradientTo} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HotyBanner({
  fillColor,
  textColor,
  rectY = 39,
  textY = 42,
}: {
  fillColor: string;
  textColor: string;
  rectY?: number;
  textY?: number;
}) {
  return (
    <>
      <rect x="19" y={rectY} width="10" height="4" rx="1" fill={fillColor} />
      <text
        x="24"
        y={textY}
        fontSize="3"
        fill={textColor}
        textAnchor="middle"
        fontWeight="bold"
      >
        HOTY
      </text>
    </>
  );
}
