import { useId } from "react";
import { SvgProps, AwardSvgShell, REGION_AWARD_CONFIG } from "../shared";

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `apac-cat-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.asia_pacific.category;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Category Champion - Australian Award"
      gradientId={gradientId}
      colors={colors}
    >
      <path
        d="M15 16 L17 27 L24 31 L31 27 L33 16 Z"
        stroke={colors.accent}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M13 16 L35 16" stroke={colors.accent} strokeWidth="1.5" />

      <path d="M15 18 L11 22 L15 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />
      <path d="M33 18 L37 22 L33 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />

      <path d="M20 31 L18 37 L30 37 L28 31 Z" fill={colors.accent} opacity="0.8" />

      <circle cx="36" cy="12" r="4" fill={colors.accent} />
      <circle cx="36" cy="12" r="2" fill={colors.primary} />
    </AwardSvgShell>
  );
};
