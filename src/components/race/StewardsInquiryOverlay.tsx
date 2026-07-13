import { useMemo, useState, useEffect } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import { formatInquiryOutcome } from "@/core/stewards/stewardTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gavel, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DISMISSED_KEY = "stewards.inquiries.dismissed.v1";

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveDismissed(s: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s].slice(-200)));
  } catch {
    /* noop */
  }
}

/**
 * Global overlay: pops when a stewards inquiry involving a player-owned horse
 * has been recorded and hasn't been acknowledged.
 */
export function StewardsInquiryOverlay() {
  const inquiries = useGameWithShallow((s: any) => s.stewardsInquiries ?? []) as StewardsInquiry[];
  const horses = useGame((s: GameState) => s.horses);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const playerHorseIds = useMemo(
    () => new Set(horses.filter((h) => h.owned).map((h) => h.id)),
    [horses],
  );

  const pending = useMemo(
    () =>
      inquiries.filter(
        (i) => i.accusedHorseId && playerHorseIds.has(i.accusedHorseId) && !dismissed.has(i.id),
      ),
    [inquiries, playerHorseIds, dismissed],
  );

  const current = pending[0];

  useEffect(() => {
    // Persist dismissed list on change
    saveDismissed(dismissed);
  }, [dismissed]);

  if (!current) return null;

  const horse = horses.find((h) => h.id === current.accusedHorseId);
  const isFavorable = current.outcome === "no_action" || current.outcome === "warning";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setDismissed(new Set([...dismissed, current.id]));
      }}
    >
      <DialogContent className="max-w-lg border-gold/40 bg-broadcast-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cream">
            <Gavel className="h-5 w-5 text-gold" />
            Stewards Inquiry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-cream/10 bg-black/30 p-3">
            <AlertTriangle
              className={`mt-0.5 h-5 w-5 ${isFavorable ? "text-emerald-400" : "text-red-400"}`}
            />
            <div className="space-y-1">
              <div className="text-cream font-medium">{horse?.name ?? "Your horse"}</div>
              <div className="text-sm text-cream-muted">{current.description}</div>
              {current.evidence && current.evidence.length > 0 && (
                <ul className="text-xs text-cream-muted list-disc pl-4 mt-1">
                  {current.evidence.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-cream border-cream/30 capitalize">
              {current.status}
            </Badge>
            {current.outcome && (
              <Badge
                className={
                  isFavorable
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                    : "border-red-400/40 bg-red-500/20 text-red-300"
                }
              >
                {formatInquiryOutcome(current.outcome)}
              </Badge>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDismissed(new Set([...dismissed, current.id]))}
            >
              Acknowledge
            </Button>
          </div>
          {pending.length > 1 && (
            <div className="text-xs text-cream-muted text-right">
              {pending.length - 1} more pending inquir{pending.length - 1 === 1 ? "y" : "ies"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
