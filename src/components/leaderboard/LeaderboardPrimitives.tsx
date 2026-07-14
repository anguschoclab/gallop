import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * Shared leaderboard visual primitives.
 *
 * These components are used across all leaderboards (sires, blue-hen mares,
 * damsires, lifetime records, season standings) to guarantee a single, consistent
 * look and feel: card shell, header, empty state, row layout, and value column.
 */

interface LeaderboardShellProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LeaderboardShell({
  title,
  description,
  icon,
  children,
  className,
}: LeaderboardShellProps) {
  return (
    <Card className={cn("bg-card border-white/5 overflow-hidden", className)}>
      <CardHeader className="bg-muted/30 border-b border-white/5">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

interface LeaderboardEmptyProps {
  message?: string;
}

export function LeaderboardEmpty({
  message = "No records found yet. Keep playing to populate the leaderboards.",
}: LeaderboardEmptyProps) {
  return (
    <Card className="bg-card border-white/5">
      <CardContent className="py-12 text-center text-muted-foreground uppercase font-black text-xs tracking-widest">
        {message}
      </CardContent>
    </Card>
  );
}

interface LeaderboardRowProps {
  rank: number;
  name: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  value: ReactNode;
  valueLabel?: string;
  onClick?: () => void;
}

export function LeaderboardRow({
  rank,
  name,
  meta,
  badges,
  value,
  valueLabel = "Score",
  onClick,
}: LeaderboardRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-3 border-b border-white/5 last:border-0 transition-colors",
        onClick && "cursor-pointer hover:bg-primary/5",
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-2xl font-black italic w-10 shrink-0 text-primary tabular-nums">
          #{rank}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold uppercase tracking-tight text-cream truncate">{name}</p>
            {badges}
          </div>
          {meta && (
            <p className="text-[11px] text-cream-muted mt-0.5 uppercase tracking-wide">{meta}</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xl font-black tabular-nums text-cream">{value}</p>
        <p className="text-[10px] text-cream-muted uppercase tracking-widest">{valueLabel}</p>
      </div>
    </div>
  );
}

interface LeaderboardHeadingProps {
  title: string;
  description?: string;
}

export function LeaderboardHeading({ title, description }: LeaderboardHeadingProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
        {title}
      </h2>
      {description && (
        <p className="text-cream-muted font-[family-name:var(--font-body)]">{description}</p>
      )}
    </div>
  );
}
