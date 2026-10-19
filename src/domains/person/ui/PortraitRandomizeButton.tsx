/**
 * person/ui/PortraitRandomizeButton.tsx - Permission-aware portrait reroll control
 *
 * Only rendered for identities the player is allowed to cosmetically reroll
 * (player owner, retained player jockeys, hired player staff). Disabled state
 * explains why via the title tooltip.
 */

import { Button } from "@/shared/ui/button";
import { Shuffle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface PortraitRandomizeButtonProps {
  onClick: () => void;
  /** Whether the reroll is permitted for this identity. */
  allowed?: boolean;
  /** Explanation shown when the reroll is not allowed. */
  deniedReason?: string;
  label?: string;
  className?: string;
}

export function PortraitRandomizeButton({
  onClick,
  allowed = true,
  deniedReason,
  label = "Randomize Portrait",
  className,
}: PortraitRandomizeButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={!allowed}
      title={!allowed ? deniedReason : "Randomize this person's appearance"}
      aria-label={label}
      className={cn("gap-2 rounded-none", className)}
    >
      <Shuffle className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
