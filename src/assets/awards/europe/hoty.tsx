import { useId } from "react";
import { SvgProps, AwardSvgShell, HotyBanner, REGION_AWARD_CONFIG } from "../shared";

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `eu-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.europe.hoty;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Horse of the Year - Cartier Award"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Crown on top */}
      <path d="M18 12 L20 8 L24 10 L28 8 L30 12 L30 14 L18 14 Z" fill={colors.accent} />
      <circle cx="20" cy="8" r="1.5" fill={colors.accent} />
      <circle cx="24" cy="10" r="1.5" fill={colors.accent} />
      <circle cx="28" cy="8" r="1.5" fill={colors.accent} />

      {/* Elegant crystal trophy stem */}
      <path
        d="M16 16 L16 24 C16 28 20 32 24 32 C28 32 32 28 32 24 L32 16"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 16 L34 16" stroke={colors.accent} strokeWidth="2" />

      {/* Handles - more elegant */}
      <path d="M16 18 C11 18 11 26 16 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />
      <path d="M32 18 C37 18 37 26 32 26" stroke={colors.accent} strokeWidth="1.5" fill="none" />

      {/* Base - crystal style */}
      <path d="M20 32 L18 38 L30 38 L28 32 Z" fill={colors.accent} opacity="0.8" />

      {/* Year banner */}
      <HotyBanner fillColor={colors.primary} textColor={colors.accent} />
    </AwardSvgShell>
  );
};
