import { Link, useNavigate } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";
import {
  ChevronRight,
  Bell,
  Flag,
  BatteryLow,
  Gavel,
  CalendarClock,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useEffect, useCallback } from "react";
import type { NextAction, NextActionKind } from "@/core/dashboard/nextAction";
import { trackEvent } from "@/core/analytics/tracker";

const ICONS: Record<NextActionKind, LucideIcon> = {
  inbox: Bell,
  race: Flag,
  fatigue: BatteryLow,
  auction: Gavel,
  advance: CalendarClock,
};

export interface NextActionBannerProps {
  action: NextAction;
  onDismiss?: (kind: NextActionKind) => void;
}

export function NextActionBanner({ action, onDismiss }: NextActionBannerProps) {
  const Icon = ICONS[action.kind];
  const navigate = useNavigate();
  const trackedKind = useRef<string | null>(null);

  useEffect(() => {
    if (trackedKind.current !== action.kind) {
      trackedKind.current = action.kind;
      trackEvent("next_action_impression", { kind: action.kind });
    }
  }, [action.kind]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate({ to: action.to, params: action.params, search: action.search });
        trackEvent("next_action_click", { kind: action.kind });
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss?.(action.kind);
      }
    },
    [action, navigate, onDismiss],
  );

  const handleDismiss = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      onDismiss?.(action.kind);
    },
    [action.kind, onDismiss],
  );

  const handleClick = useCallback(() => {
    trackEvent("next_action_click", { kind: action.kind });
  }, [action.kind]);

  return (
    <section
      role="region"
      aria-label="Next action"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="group relative flex items-center gap-4 rounded-lg border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent px-5 py-4 shadow-[0_0_24px_rgba(212,175,55,0.08)] transition hover:border-gold/60 hover:from-gold/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
    >
      <Link
        to={action.to as FileRouteTypes["to"]}
        params={action.params as Record<string, string>}
        search={action.search as Record<string, unknown>}
        aria-label={`${action.label}: ${action.detail}`}
        onClick={handleClick}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0" aria-live="polite">
          <p className="text-[10px] font-black uppercase tracking-wide text-gold/80 font-[family-name:var(--font-mono)]">
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

      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss next action banner"
          onClick={handleDismiss}
          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-cream-muted transition hover:text-cream hover:bg-gold-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
