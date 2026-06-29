import { useId } from "react";
import { SvgProps, AwardSvgShell, HotyBanner, REGION_AWARD_CONFIG } from "../shared";

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `na-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.north_america.hoty;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Horse of the Year - Eclipse Award"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Trophy cup */}
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

      {/* Star on top */}
      <path
        d="M24 6 L25 9 L28 9 L25.5 11 L26.5 14 L24 12 L21.5 14 L22.5 11 L20 9 L23 9 Z"
        fill={colors.accent}
      />

      {/* Year banner */}
      <HotyBanner fillColor={colors.primary} textColor={colors.accent} rectY={36} textY={39} />
    </AwardSvgShell>
  );
};
