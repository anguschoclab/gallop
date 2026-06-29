import { useId } from "react";
import { SvgProps, AwardSvgShell, REGION_AWARD_CONFIG } from "../shared";

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `na-cat-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.north_america.category;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Category Champion - Eclipse Award"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Trophy cup - Silver variant */}
      <path
        d="M16 14 L16 20 C16 26 20 30 24 30 C28 30 32 26 32 20 L32 14"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 14 L34 14" stroke={colors.accent} strokeWidth="2" />
      <path
        d="M18 14 L18 12 C18 11 19 10 20 10 L28 10 C29 10 30 11 30 12 L30 14"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />

      {/* Handles */}
      <path d="M16 16 C12 16 12 22 16 22" stroke={colors.accent} strokeWidth="2" fill="none" />
      <path d="M32 16 C36 16 36 22 32 22" stroke={colors.accent} strokeWidth="2" fill="none" />

      {/* Base */}
      <rect x="20" y="30" width="8" height="4" fill={colors.accent} />
      <rect x="18" y="34" width="12" height="2" fill={colors.accent} />

      {/* Star accent */}
      <circle cx="36" cy="12" r="4" fill="#C9A227" />
      <path
        d="M36 9 L37 11 L39 11 L37.5 12.5 L38 14.5 L36 13.5 L34 14.5 L34.5 12.5 L33 11 L35 11 Z"
        fill={colors.primary}
      />
    </AwardSvgShell>
  );
};
