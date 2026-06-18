import { Link } from "@tanstack/react-router";
import { ChevronRight, Bell, Flag, BatteryLow, Gavel, CalendarClock, type LucideIcon } from "lucide-react";
import type { NextAction, NextActionKind } from "@/core/dashboard/nextAction";

const ICONS: Record<NextActionKind, LucideIcon> = {
  inbox: Bell,
  race: Flag,
  fatigue: BatteryLow,
  auction: Gavel,
  advance: CalendarClock,
};

export function NextActionBanner({ action }: { action: NextAction }) {
  const Icon = ICONS[action.kind];
  return (
    <Link
      to={action.to as any}
      params={action.params as any}
      search={action.search as any}
      className="group flex items-center gap-4 rounded-lg border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent px-5 py-4 shadow-[0_0_24px_rgba(212,175,55,0.08)] transition hover:border-gold/60 hover:from-gold/15"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold/80 font-[family-name:var(--font-mono)]">
          Next up
        </p>
        <p className="text-lg font-bold text-cream font-[family-name:var(--font-display)] truncate">
          {action.label}
        </p>
        <p className="text-xs text-cream-muted font-[family-name:var(--font-body)] truncate">
          {action.detail}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-gold/60 transition group-hover:translate-x-0.5 group-hover:text-gold" />
    </Link>
  );
}
