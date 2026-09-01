/**
 * StableCompareBar.tsx - Sticky bottom bar for opening the compare drawer
 *
 * Renders only when at least one stable is selected for comparison. Controls
 * the drawer open state locally.
 *
 * Dependencies: @/hooks/stable/useCompareStables (useCompareStables), ./StableCompareDrawer (StableCompareDrawer), @/components/ui/button (Button)
 * Related files: src/routes/npc-stables.index.tsx (renders this bar), src/routes/npc-stables.compare.tsx (renders this bar)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitCompare, X } from "lucide-react";
import { useCompareStables } from "@/hooks/stable/useCompareStables";
import { StableCompareDrawer } from "./StableCompareDrawer";

/**
 * Sticky bottom bar that shows the count of selected stables and opens the
 * comparison drawer. Returns null when no stables are selected.
 */
export function StableCompareBar() {
  const ids = useCompareStables((s) => s.ids);
  const clear = useCompareStables((s) => s.clear);
  const [open, setOpen] = useState(false);

  if (ids.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-gold-muted bg-card px-4 py-2 shadow-lg">
          <GitCompare className="h-4 w-4 text-gold" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => setOpen(true)}
            aria-label="Compare selected stables"
          >
            Compare ({ids.length})
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clear}
            aria-label="Clear comparison"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <StableCompareDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
