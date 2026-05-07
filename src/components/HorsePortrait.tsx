import type { CoatColor, HorseMarkings, HorseGender } from "@/game/types";
import { ProceduralHorsePortrait } from "@/components/ProceduralHorsePortrait";
import { cn } from "@/lib/utils";

interface HorsePortraitProps {
  /** Horse id — drives deterministic procedural variation. */
  id?: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  gender?: HorseGender;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
  /** Legacy / no-op props kept for back-compat with existing call sites. */
  fallbackToSilk?: boolean;
  silkColor?: string;
}

const SIZE_MAP = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-40 h-40",
  xl: "w-60 h-60",
  "2xl": "w-80 h-80",
};

export function HorsePortrait({
  id,
  coatColor,
  markings,
  gender,
  size = "md",
  className,
  alt = "Horse portrait",
}: HorsePortraitProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/30",
        SIZE_MAP[size],
        className,
      )}
    >
      <ProceduralHorsePortrait
        id={id}
        coatColor={coatColor}
        markings={markings}
        gender={gender}
        alt={alt}
      />
    </div>
  );
}

interface HorsePortraitBadgeProps {
  id?: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  gender?: HorseGender;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_SIZE = { sm: "w-12 h-12", md: "w-20 h-20", lg: "w-40 h-40" };

export function HorsePortraitBadge({
  id,
  coatColor,
  markings,
  gender,
  size = "sm",
  className,
}: HorsePortraitBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden border-2 border-white shadow shrink-0",
        BADGE_SIZE[size],
        className,
      )}
    >
      <ProceduralHorsePortrait
        id={id}
        coatColor={coatColor}
        markings={markings}
        gender={gender}
      />
    </div>
  );
}
