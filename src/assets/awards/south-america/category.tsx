import { useId } from "react";
import { SvgProps, AwardSvgShell, REGION_AWARD_CONFIG } from "../shared";

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `sa-cat-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.south_america.category;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Category Champion - Gran Premio"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Chalice trophy */}
      <path
        d="M16 17 C16 25 20 29 24 29 C28 29 32 25 32 17"
        stroke={colors.accent}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M14 17 L34 17" stroke={colors.accent} strokeWidth="1.5" />

      {/* Handles */}
      <path d="M16 19 C11 21 11 26 16 24" stroke={colors.accent} strokeWidth="1.5" fill="none" />
      <path d="M32 19 C37 21 37 26 32 24" stroke={colors.accent} strokeWidth="1.5" fill="none" />

      {/* Base */}
      <path d="M20 29 L18 36 L30 36 L28 29 Z" fill={colors.accent} opacity="0.8" />

      {/* Gold accent */}
      <circle cx="36" cy="12" r="4" fill={colors.accent} />
      <path d="M34 12 L38 12 M36 10 L36 14" stroke={colors.primary} strokeWidth="1" />
    </AwardSvgShell>
  );
};
