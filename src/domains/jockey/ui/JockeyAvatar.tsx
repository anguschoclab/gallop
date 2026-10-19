import type { Jockey } from "@/platform/game/types";
import { PersonAvatar, type PersonAvatarSize } from "@/domains/person/ui/PersonAvatar";

export type JockeyAvatarSize = PersonAvatarSize;

interface Props {
  jockey: Pick<Jockey, "id" | "silk" | "person">;
  size?: JockeyAvatarSize;
  className?: string;
  rounded?: "md" | "lg" | "full";
}

/**
 * Sizing tokens for jockey avatar components.
 * Kept for backward compatibility with existing callers.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const SIZE_MAP = {
  xs: { w: 30, h: 36 },
  sm: { w: 40, h: 48 },
  md: { w: 55, h: 66 },
  lg: { w: 70, h: 84 },
  xl: { w: 95, h: 114 },
};

/** Aspect ratio invariant (5:6) — referenced by tests and layout calculations */
export const JOCKEY_AVATAR_ASPECT = 5 / 6;

export function JockeyAvatar({ jockey, size = "md", className, rounded = "md" }: Props) {
  return (
    <PersonAvatar
      identity={jockey.person}
      context="jockey-racewear"
      size={size}
      silk={jockey.silk}
      className={className}
      rounded={rounded}
    />
  );
}
