import type { CoatColor } from "@/game/types";
import { getPortraitUrl } from "@/core/horse/portrait";
import { cn } from "@/lib/utils";

interface HorsePortraitProps {
  coatColor?: CoatColor;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
  fallbackToSilk?: boolean;
  silkColor?: string;
}

const SIZE_MAP = {
  sm: { width: 48, height: 48, class: "w-12 h-12" },
  md: { width: 80, height: 80, class: "w-20 h-20" },
  lg: { width: 160, height: 160, class: "w-40 h-40" },
  xl: { width: 240, height: 240, class: "w-60 h-60" },
  "2xl": { width: 320, height: 320, class: "w-80 h-80" },
};

export function HorsePortrait({
  coatColor,
  size = "md",
  className,
  alt = "Horse portrait",
  fallbackToSilk = false,
  silkColor,
}: HorsePortraitProps) {
  const url = getPortraitUrl(coatColor);
  const sizeCfg = SIZE_MAP[size];

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-muted/30", sizeCfg.class, className)}
    >
      <img
        src={url}
        alt={alt}
        width={sizeCfg.width}
        height={sizeCfg.height}
        className="object-contain w-full h-full"
        loading="lazy"
        onError={(e) => {
          if (fallbackToSilk && silkColor) {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.style.backgroundColor = silkColor;
          }
        }}
      />
    </div>
  );
}

interface HorsePortraitBadgeProps {
  coatColor?: CoatColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HorsePortraitBadge({ coatColor, size = "sm", className }: HorsePortraitBadgeProps) {
  const url = getPortraitUrl(coatColor);
  const sizeCfg = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden border-2 border-white shadow shrink-0",
        sizeCfg.class,
        className,
      )}
    >
      <img
        src={url}
        alt=""
        width={sizeCfg.width}
        height={sizeCfg.height}
        className="object-cover w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
