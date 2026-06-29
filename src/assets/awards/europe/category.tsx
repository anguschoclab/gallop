import { useId } from "react";
import { SvgProps, AwardSvgShell, REGION_AWARD_CONFIG } from "../shared";

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `eu-cat-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.europe.category;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Category Champion - Cartier Award"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Elegant trophy */}
      <path
        d="M16 16 L16 24 C16 28 20 32 24 32 C28 32 32 28 32 24 L32 16"
        stroke={colors.accent}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M14 16 L34 16" stroke={colors.accent} strokeWidth="1.5" />

      {/* Handles */}
      <path d="M16 18 C11 18 11 26 16 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />
      <path d="M32 18 C37 18 37 26 32 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />

      {/* Base */}
      <path d="M20 32 L18 38 L30 38 L28 32 Z" fill={colors.accent} opacity="0.6" />

      {/* Crystal accent */}
      <circle cx="36" cy="12" r="4" fill={colors.accent} />
      <path d="M34 10 L38 14 M38 10 L34 14" stroke={colors.primary} strokeWidth="1" />
    </AwardSvgShell>
  );
};
