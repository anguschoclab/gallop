/**
 * person/ui/PersonAvatar.tsx - Sized avatar wrapper for person identities
 */

import type { PersonIdentity, PortraitContext } from "@/domains/person/model/types";
import { PersonPortrait } from "@/domains/person/ui/PersonPortrait";
import { cn } from "@/shared/lib/cn";
import {
  PERSON_AVATAR_SIZE_MAP,
  PERSON_AVATAR_ASPECT,
  type PersonAvatarSize,
} from "@/domains/person/ui/personAvatarSizes";

interface Props {
  identity: PersonIdentity;
  context?: PortraitContext;
  size?: PersonAvatarSize;
  silk?: { primary: string; secondary: string; cap: string; pattern: string } | null;
  className?: string;
  rounded?: "md" | "lg" | "full";
  decorative?: boolean;
}

export type { PersonAvatarSize };
export { PERSON_AVATAR_SIZE_MAP, PERSON_AVATAR_ASPECT };

export function PersonAvatar({
  identity,
  context = "owner-formal",
  size = "md",
  silk,
  className,
  rounded = "md",
  decorative = false,
}: Props) {
  const { w, h } = PERSON_AVATAR_SIZE_MAP[size];
  const radius =
    rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";

  return (
    <div
      data-testid="person-avatar"
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
      <PersonPortrait
        identity={identity}
        context={context}
        width={Math.round(w * 0.92)}
        height={Math.round(h * 0.92)}
        silk={silk}
        decorative={decorative}
      />
    </div>
  );
}
