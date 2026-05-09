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

/**
 * JockeyAvatar — single source of truth for jockey portrait sizing
 * across the app. Frame is a fixed 5:6 portrait aspect ratio so the
 * silhouette never warps regardless of parent layout.
 *
 * Container uses max-width:100% so it cannot overflow narrow parents
 * (e.g. mobile cards, table cells). The inner SVG scales with width.
 */
export const SIZE_MAP: Record<JockeyAvatarSize, { w: number; h: number }> = {
  xs: { w: 28, h: 34 }, // table rows / inline name chips
  sm: { w: 40, h: 48 }, // dense lists, mobile cards
  md: { w: 56, h: 68 }, // default — JockeyCard, race summary
  lg: { w: 72, h: 88 }, // detail headers
  xl: { w: 96, h: 116 }, // hero / profile pages
};

// Aspect ratio invariant — referenced by tests
export const JOCKEY_AVATAR_ASPECT = 5 / 6;

export function JockeyAvatar({ jockey, size = "md", className, rounded = "md" }: Props) {
  const { w, h } = SIZE_MAP[size];
  const radius =
    rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";
  return (
    <div
      data-testid="jockey-avatar"
      data-size={size}
      className={cn(
        "shrink-0 inline-flex items-end justify-center overflow-hidden border border-border bg-gradient-to-b from-muted to-muted/40 max-w-full",
        radius,
        className,
      )}
      style={{
        width: w,
        height: h,
        aspectRatio: "5 / 6",
      }}
    >
      <JockeyPortrait jockey={jockey} size={Math.round(w * 0.92)} />
    </div>
  );
}
