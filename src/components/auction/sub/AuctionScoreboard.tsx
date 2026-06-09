/**
 * AuctionScoreboard.tsx - Real-time auction statistics
 *
 * Displays player cash, lots remaining, and acquisition/sale totals.
 */

import { formatCurrency } from "@/lib/formatting";
import type { useScoreboard } from "@/hooks/auction/useScoreboard";

interface AuctionScoreboardProps {
  cash: number;
  lotsRemaining: number;
  scoreboard: ReturnType<typeof useScoreboard>;
}

export function AuctionScoreboard({ cash, lotsRemaining, scoreboard }: AuctionScoreboardProps) {
  const showProceeds = scoreboard && scoreboard.sold > 0;

  return (
    <div
      className={`grid gap-2 text-sm ${
        showProceeds ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"
      }`}
    >
      <ScoreCell label="Cash" value={formatCurrency(cash)} />
      <ScoreCell label="Lots remaining" value={String(lotsRemaining)} />
      <ScoreCell
        label="Acquired"
        value={scoreboard ? `${scoreboard.won} · ${formatCurrency(scoreboard.spent)}` : "—"}
      />
      <ScoreCell label="Sold" value={scoreboard ? String(scoreboard.sold) : "—"} />
      {showProceeds && (
        <ScoreCell label="Proceeds" value={formatCurrency(scoreboard.netReceived)} />
      )}
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card/50 backdrop-blur-sm px-4 py-2 shadow-sm transition-all hover:bg-card">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-0.5">
        {label}
      </p>
      <p className="font-black tabular-nums text-foreground">{value}</p>
    </div>
  );
}
