import type { CoatColor, HorseMarkings, HorseGender, AppearanceDNA } from "@/game/types";
import { ProceduralHorsePortrait } from "@/components/ProceduralHorsePortrait";
import { cn } from "@/lib/utils";

interface HorsePortraitProps {
  /** Horse id — drives deterministic procedural variation when no DNA given. */
  id?: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  gender?: HorseGender;
  appearance?: AppearanceDNA;
  /** "head" (default) or "full"-body view. */
  view?: "head" | "full";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
  /** Legacy / no-op props kept for back-compat. */
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
  appearance,
  view = "head",
  size = "md",
  className,
  alt = "Horse portrait",
}: HorsePortraitProps) {
  // Full-body view is naturally wider — let it stretch by allowing aspect-auto
  // when called with a wider container.
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/30",
        view === "head" ? SIZE_MAP[size] : "w-full",
        className,
      )}
    >
      <ProceduralHorsePortrait
        id={id}
        coatColor={coatColor}
        markings={markings}
        gender={gender}
        appearance={appearance}
        view={view}
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
  appearance?: AppearanceDNA;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_SIZE = { sm: "w-12 h-12", md: "w-20 h-20", lg: "w-40 h-40" };

export function HorsePortraitBadge({
  id,
  coatColor,
  markings,
  gender,
  appearance,
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
        appearance={appearance}
      />
    </div>
  );
}
