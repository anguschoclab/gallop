/**
 * StableCompareDrawer.tsx - Drawer wrapper for the stable comparison table
 *
 * Loads full Stable objects for the selected compare IDs from the game store,
 * renders them in a StableCompareTable, and provides a clear button.
 *
 * Dependencies: @/components/ui/drawer (Drawer, DrawerContent, ...), @/game/store (useNpcStables), @/hooks/stable/useCompareStables (useCompareStables), ./StableCompareTable (StableCompareTable)
 * Related files: ./StableCompareBar.tsx (opens this drawer)
 */

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { useCompareStables } from "@/hooks/stable/useCompareStables";
import { StableCompareTable } from "./StableCompareTable";

interface StableCompareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Render the comparison drawer. Loads stable objects for the selected IDs,
 * skipping any that no longer exist (e.g. dissolved via bankruptcy).
 */
export function StableCompareDrawer({ open, onOpenChange }: StableCompareDrawerProps) {
  const ids = useCompareStables((s) => s.ids);
  const clear = useCompareStables((s) => s.clear);
  const allStables = useNpcStables();
  const selectedStables = ids
    .map((id) => allStables.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <div>
            <DrawerTitle>Compare Stables ({selectedStables.length})</DrawerTitle>
            <DrawerDescription>
              Side-by-side cash pressure, runway, and private-sale thresholds.
            </DrawerDescription>
          </div>
          {selectedStables.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} aria-label="Clear comparison">
              Clear
            </Button>
          )}
        </DrawerHeader>
        <div className="overflow-auto px-4 pb-4">
          <StableCompareTable stables={selectedStables} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
