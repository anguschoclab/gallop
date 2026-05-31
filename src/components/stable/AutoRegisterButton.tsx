/**
 * AutoRegisterButton.tsx - Smart auto-registration button for stable page
 *
 * Provides a button to automatically enter player horses into the best available
 * upcoming races with AI suitability scoring, auto jockey assignment, and budget safety.
 *
 * Dependencies: ../ui/* (Button, Dialog, Badge, Table), @/game/store (useGame, useGameWithShallow),
 * @/game/autoRegister (calculateAutoRegisterEntries), @/game/hooks/useCoreState (useHorses, useCash, useDay),
 * @/game/hooks/useSystemsState (useJockeys), lucide-react (Zap, X, Check, AlertTriangle, Info)
 * Related files: autoRegister.ts (core logic), stable.index.tsx (integration point)
 */

import { useState, useMemo } from "react";
import { useGame } from "@/game/store";
import { calculateAutoRegisterEntries } from "@/game/autoRegister";
import { useHorses, useCash, useDay, useRaces } from "@/game/hooks/useCoreState";
import { useJockeys } from "@/game/hooks/useSystemsState";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, X, Check, AlertTriangle, Info, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";

export function AutoRegisterButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get state from hooks
  const horses = useHorses();
  const races = useRaces();
  const jockeys = useJockeys();
  const cash = useCash();
  const day = useDay();

  // Get store actions
  const enterRace = useGame((s) => s.enterRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const setRaceTactics = useGame((s) => s.setRaceTactics);

  // Calculate auto-register entries
  const result = useMemo(() => {
    return calculateAutoRegisterEntries(horses, races, jockeys, cash, day);
  }, [horses, races, jockeys, cash, day]);

  // Derived state for UI
  const eligibleCount = result.entries.length + result.skipped.length;
  const hasEntries = result.entries.length > 0;
  const hasBudget = result.affordableCount > 0;

  // Button state
  const isDisabled = eligibleCount === 0 || !hasBudget;
  const buttonTooltip =
    eligibleCount === 0
      ? "No eligible horses for auto-registration"
      : !hasBudget
        ? "Insufficient budget for any entries"
        : undefined;

  // Execute auto-registration
  const handleConfirm = async () => {
    setIsProcessing(true);
    const successful: string[] = [];
    const failed: { name: string; reason: string }[] = [];

    for (const entry of result.entries) {
      // Enter race
      const enterResult = enterRace(entry.raceId, entry.horseId);
      if (!enterResult.ok) {
        failed.push({
          name: entry.horseName,
          reason: enterResult.reason || "Failed to enter race",
        });
        continue;
      }

      // Assign jockey if available
      if (entry.jockeyId) {
        const jockeyResult = assignJockey(entry.raceId, entry.horseId, entry.jockeyId);
        if (!jockeyResult.ok) {
          // Continue even if jockey assignment fails - race entry succeeded
          console.warn(`Jockey assignment failed for ${entry.horseName}:`, jockeyResult.reason);
        }
      }

      // Set default tactics
      setRaceTactics(entry.raceId, entry.horseId, "default");

      successful.push(entry.horseName);
    }

    setIsProcessing(false);
    setIsOpen(false);

    // Show toast with results
    if (successful.length > 0) {
      toast.success(
        `Auto-registered ${successful.length} horse${successful.length > 1 ? "s" : ""}`,
        {
          description: successful.join(", "),
        },
      );
    }

    if (failed.length > 0) {
      toast.error(`${failed.length} registration${failed.length > 1 ? "s" : ""} failed`, {
        description: failed.map((f) => `${f.name}: ${f.reason}`).join("; "),
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-primary/30 hover:bg-primary/10 text-primary font-bold uppercase text-[10px] tracking-widest"
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        title={buttonTooltip}
      >
        <Zap className="h-3.5 w-3.5" />
        Auto-Register
        {eligibleCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">
            {Math.min(result.affordableCount, eligibleCount)}
          </Badge>
        )}
      </Button>

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

          {/* Summary Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {hasEntries ? (
                  <>
                    <span className="text-primary font-bold">{result.entries.length}</span> horses
                    ready for registration
                  </>
                ) : (
                  <span className="text-muted-foreground">No eligible registrations found</span>
                )}
              </span>
              {result.skipped.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {result.skipped.length} skipped
                </Badge>
              )}
            </div>

            {hasEntries && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-background rounded p-2 text-center">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Total Cost
                  </div>
                  <div className="font-bold text-destructive">
                    {formatCurrency(result.totalCost)}
                  </div>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Remaining
                  </div>
                  <div className="font-bold text-success">
                    {formatCurrency(result.remainingCash)}
                  </div>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Reserve
                  </div>
                  <div className="font-bold text-muted-foreground">
                    {formatCurrency(cash - result.remainingCash - result.totalCost)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Entries Table */}
          {hasEntries && (
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase">Horse</TableHead>
                    <TableHead className="text-[10px] uppercase">Race</TableHead>
                    <TableHead className="text-[10px] uppercase text-center">Day</TableHead>
                    <TableHead className="text-[10px] uppercase">Jockey</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.entries.map((entry) => (
                    <TableRow key={entry.horseId} className="text-sm">
                      <TableCell className="font-medium">{entry.horseName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[150px]">{entry.raceName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {entry.raceDay}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {entry.jockeyName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(entry.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Skipped Section */}
          {result.skipped.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium mb-2 text-muted-foreground">
                <Info className="h-4 w-4" />
                {result.skipped.length} horse{result.skipped.length > 1 ? "s" : ""} skipped
              </div>
              <div className="space-y-1 max-h-24 overflow-auto">
                {result.skipped.map((skip) => (
                  <div
                    key={skip.horseId}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>{skip.horseName}</span>
                    <Badge variant="secondary" className="text-[9px]">
                      {skip.reason}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Entries State */}
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
