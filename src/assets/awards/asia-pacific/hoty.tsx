import { useId } from "react";
import { SvgProps, AwardSvgShell, HotyBanner, REGION_AWARD_CONFIG } from "../shared";

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `apac-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.asia_pacific.hoty;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Racehorse of the Year - Australian Award"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Sunburst rays */}
      <g stroke={colors.accent} strokeWidth="1" opacity="0.5">
        <line x1="24" y1="4" x2="24" y2="8" />
        <line x1="36" y1="8" x2="33" y2="11" />
        <line x1="44" y1="20" x2="40" y2="21" />
        <line x1="44" y1="28" x2="40" y2="27" />
        <line x1="12" y1="8" x2="15" y2="11" />
        <line x1="4" y1="20" x2="8" y2="21" />
      </g>

      {/* Modern angular trophy */}
      <path
        d="M15 15 L17 28 L24 32 L31 28 L33 15 Z"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />
      <path d="M13 15 L35 15" stroke={colors.accent} strokeWidth="2" />

      {/* Angular handles */}
      <path d="M15 17 L10 22 L15 27" stroke={colors.accent} strokeWidth="2" fill="none" />
      <path d="M33 17 L38 22 L33 27" stroke={colors.accent} strokeWidth="2" fill="none" />

      {/* Base */}
      <path d="M19 32 L17 38 L31 38 L29 32 Z" fill={colors.accent} />

      {/* Year banner */}
      <HotyBanner fillColor={colors.primary} textColor={colors.accent} />
    </AwardSvgShell>
  );
};
