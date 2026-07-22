/**
 * AutoRegisterButton.tsx - Smart auto-registration button for stable page
 *
 * Thin presentational wrapper around the useAutoRegister hook.
 */

import { useState } from "react";
import { useAutoRegister } from "@/hooks/horse/useAutoRegister";
import { useCash } from "@/hooks/game/useCoreState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { Zap, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { AutoRegisterSummary } from "./AutoRegisterSummary";
import { AutoRegisterEntriesTable } from "./AutoRegisterEntriesTable";
import { AutoRegisterSkippedList } from "./AutoRegisterSkippedList";

export function AutoRegisterButton() {
  const [isOpen, setIsOpen] = useState(false);
  const cash = useCash();
  const {
    result,
    isProcessing,
    execute,
    eligibleCount,
    hasEntries,
    hasEligibleHorses,
    isDisabled,
    buttonTooltip,
  } = useAutoRegister();

  const handleConfirm = async () => {
    await execute();
    setIsOpen(false);
  };

  const button = (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "gap-2 border-primary/30 hover:bg-primary/10 text-primary font-bold uppercase text-[10px] tracking-widest",
        isDisabled && "pointer-events-none"
      )}
      onClick={() => setIsOpen(true)}
      disabled={isDisabled}
    >
      <Zap className="h-3.5 w-3.5" />
      Auto-Register
      {eligibleCount > 0 && (
        <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">
          {eligibleCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      {buttonTooltip ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-block cursor-not-allowed">
                {button}
              </span>
            </TooltipTrigger>
            <TooltipContent>{buttonTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase italic text-primary">
              <Zap className="h-5 w-5" />
              Auto-Register Races
            </DialogTitle>
            <DialogDescription>
              Smart race entry with AI suitability scoring and budget safety
            </DialogDescription>
          </DialogHeader>

          <AutoRegisterSummary result={result} cash={cash} />
          <AutoRegisterEntriesTable entries={result.entries} />
          <AutoRegisterSkippedList skipped={result.skipped} />

          {!hasEntries && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No suitable races found</p>
              <p className="text-sm mt-1">
                Try checking race eligibility or energy levels of your horses
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            {hasEntries && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isProcessing || result.entries.length === 0}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Register {result.entries.length} Horse
                    {result.entries.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
