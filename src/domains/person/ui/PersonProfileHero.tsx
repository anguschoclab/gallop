/**
 * person/ui/PersonProfileHero.tsx - Responsive person detail header
 *
 * Portrait hero for jockey/staff/owner detail surfaces: identity portrait at
 * hero size beside display name, role, and biography fields. Context only
 * changes wardrobe/framing — the face comes from the identity's DNA.
 */

import type { PersonIdentity, PersonRole, PortraitContext } from "@/domains/person/model/types";
import { personRoleLabel, getIdentityAge } from "@/domains/person/application/personFacade";
import { PersonAvatar } from "@/domains/person/ui/PersonAvatar";
import { cn } from "@/shared/lib/cn";
import type { ReactNode } from "react";

interface PersonProfileHeroProps {
  identity: PersonIdentity;
  role: PersonRole;
  context?: PortraitContext;
  silk?: { primary: string; secondary: string; cap: string; pattern: string } | null;
  /** Current game day for age derivation. */
  day?: number;
  /** Optional subtitle line under the display name (e.g. stable name). */
  subtitle?: string;
  /** Optional action controls rendered under the biography block. */
  children?: ReactNode;
  className?: string;
}

export function PersonProfileHero({
  identity,
  role,
  context = "owner-formal",
  silk,
  day,
  subtitle,
  children,
  className,
}: PersonProfileHeroProps) {
  const bio = identity.biography;
  const age = day !== undefined ? getIdentityAge(day, identity) : undefined;

  return (
    <div
      data-testid="person-profile-hero"
      className={cn("flex flex-col sm:flex-row gap-5 items-start", className)}
    >
      <PersonAvatar
        identity={identity}
        context={context}
        size="xl"
        silk={silk}
        rounded="lg"
        className="border border-white/10 shadow-xl"
      />
      <div className="min-w-0 space-y-1.5 flex-1">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-cream truncate font-[family-name:var(--font-display)]">
          {bio.displayName}
        </h2>
        {subtitle && <div className="text-sm text-cream-muted truncate">{subtitle}</div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream/60 font-mono">
          <span className="uppercase tracking-wide">{personRoleLabel(role)}</span>
          {age !== undefined && <span>Age {age}</span>}
          {bio.nationality && <span>{bio.nationality}</span>}
          {bio.hometown && <span>{bio.hometown}</span>}
          <span>{bio.pronouns}</span>
        </div>
        {children && <div className="pt-2 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
