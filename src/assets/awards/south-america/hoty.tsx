import { useId } from "react";
import { SvgProps, AwardSvgShell, HotyBanner, REGION_AWARD_CONFIG } from "../shared";

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `sa-bg-${id}`;
  const colors = REGION_AWARD_CONFIG.south_america.hoty;

  return (
    <AwardSvgShell
      width={width}
      height={height}
      className={className}
      title="Horse of the Year - Gran Premio"
      gradientId={gradientId}
      colors={colors}
    >
      {/* Laurel wreath top */}
      <ellipse cx="24" cy="10" rx="10" ry="4" fill="none" stroke={colors.accent} strokeWidth="1.5" />
      <path d="M16 10 Q20 6 24 10 Q28 6 32 10" stroke={colors.accent} strokeWidth="1" fill="none" />

      {/* Ornate chalice trophy */}
      <path
        d="M16 16 C16 24 20 28 24 28 C28 28 32 24 32 16"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 16 L34 16" stroke={colors.accent} strokeWidth="2" />
      <path
        d="M20 16 L20 12 C20 11 22 10 24 10 C26 10 28 11 28 12 L28 16"
        stroke={colors.accent}
        strokeWidth="2"
        fill="none"
      />

      {/* Ornate handles */}
      <path d="M16 18 C10 20 10 26 16 24" stroke={colors.accent} strokeWidth="2" fill="none" />
      <path d="M32 18 C38 20 38 26 32 24" stroke={colors.accent} strokeWidth="2" fill="none" />

      {/* Ornate base */}
      <path d="M20 28 L18 36 L30 36 L28 28 Z" fill={colors.accent} />
      <circle cx="24" cy="38" r="3" fill={colors.accent} />

      {/* Year banner */}
      <HotyBanner fillColor={colors.primary} textColor={colors.accent} />
    </AwardSvgShell>
  );
};
