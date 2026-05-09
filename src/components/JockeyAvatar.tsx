import type { Jockey } from "@/game/types";
import { JockeyPortrait } from "./JockeyPortrait";
import { cn } from "@/lib/utils";

export type JockeyAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface Props {
  jockey: Pick<Jockey, "id" | "silk" | "age" | "archetype">;
  size?: JockeyAvatarSize;
  className?: string;
  rounded?: "md" | "lg" | "full";
}

// Single source of truth for portrait sizing across the app.
// Frame uses a 5:6 aspect ratio (portrait), portrait SVG fills it.
const SIZE_MAP: Record<JockeyAvatarSize, { w: number; h: number; portrait: number }> = {
  xs: { w: 28, h: 34, portrait: 26 },
  sm: { w: 40, h: 48, portrait: 38 },
  md: { w: 56, h: 68, portrait: 52 },
  lg: { w: 72, h: 88, portrait: 68 },
  xl: { w: 96, h: 116, portrait: 92 },
};

export function JockeyAvatar({ jockey, size = "md", className, rounded = "md" }: Props) {
  const { w, h, portrait } = SIZE_MAP[size];
  const radius = rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";
  return (
    <div
      className={cn(
        "shrink-0 flex items-end justify-center overflow-hidden border border-border bg-gradient-to-b from-muted to-muted/40",
        radius,
        className,
      )}
      style={{ width: w, height: h }}
    >
      <JockeyPortrait jockey={jockey} size={portrait} />
    </div>
  );
}
