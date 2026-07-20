import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/core/financial";

export const Route = createFileRoute("/epilogue")({
  component: EpiloguePage,
});

function EpiloguePage() {
  const navigate = useNavigate();
  const snapshot = useGame((s) => s.runEndSnapshot);
  const runEnded = useGame((s) => s.runEnded ?? false);

  useEffect(() => {
    if (!runEnded) {
      navigate({ to: "/" }).catch(() => {});
    }
  }, [runEnded, navigate]);

  if (!snapshot) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-cream-muted">No run to memorialize yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 space-y-10 animate-fade-in">
      <header className="border-b border-gold/20 pb-6 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold-bright font-mono">
          Final Chapter
        </p>
        <h1 className="text-5xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
          The Stable Falls Silent
        </h1>
        <p className="text-cream-muted italic">{snapshot.causeOfDeath}</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCell label="Days survived" value={snapshot.day.toLocaleString()} />
        <StatCell label="Horses owned" value={snapshot.horsesOwned.toLocaleString()} />
        <StatCell
          label="Lifetime earnings"
          value={formatCurrency(snapshot.lifetimeEarnings)}
        />
        <StatCell label="Reputation" value={snapshot.reputationTier} />
      </section>

      <section className="border border-white/5 rounded-lg bg-slate-950/60 p-6 space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-gold-bright font-mono">
          Legacy epitaph
        </h2>
        <p className="text-cream leading-relaxed">
          At day {snapshot.day.toLocaleString()}, the ledger read {formatCurrency(snapshot.cash)}.
          The horses were led away, the silks folded, the stalls swept clean. What remains is
          {" "}
          {snapshot.lifetimeEarnings > 0
            ? `a record of ${formatCurrency(snapshot.lifetimeEarnings)} won on the turf`
            : "only what might have been"}
          {" "}— and the memory of every horse that carried your colors.
        </p>
      </section>

      <footer className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/start"
          className="inline-flex items-center px-6 py-3 bg-gold text-slate-950 font-bold rounded uppercase tracking-widest text-xs hover:bg-gold-bright transition-colors"
        >
          Begin a new stable
        </Link>
        <Link
          to="/hall-of-fame"
          className="text-sm text-cream-muted underline underline-offset-4 hover:text-cream"
        >
          Visit the Hall of Fame
        </Link>
      </footer>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/5 bg-slate-950/40 p-4 text-center">
      <div className="text-[9px] uppercase tracking-widest text-cream-muted/60 font-mono mb-1">
        {label}
      </div>
      <div className="text-xl font-bold text-cream font-mono tabular-nums">
        {value}
      </div>
    </div>
  );
}
