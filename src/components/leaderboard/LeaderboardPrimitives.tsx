import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
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
      <CardContent className="py-12 text-center text-muted-foreground uppercase font-black text-xs tracking-wide">
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
        "flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/5 last:border-0 transition-colors",
        onClick && "cursor-pointer hover:bg-primary/5 min-h-[44px]",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <span className="text-xl sm:text-2xl font-black italic w-8 sm:w-10 shrink-0 text-primary tabular-nums">
          #{rank}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold uppercase tracking-tight text-cream truncate">{name}</p>
            {badges}
          </div>
          {meta && (
            <p className="text-[11px] text-cream-muted mt-0.5 uppercase tracking-wide line-clamp-1 sm:line-clamp-none">
              {meta}
            </p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg sm:text-xl font-black tabular-nums text-cream">{value}</p>
        <p className="text-[10px] text-cream-muted uppercase tracking-wide">{valueLabel}</p>
      </div>
    </div>
  );
}

interface LeaderboardHeadingProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
}

export function LeaderboardHeading({ title, description, rightSlot }: LeaderboardHeadingProps) {
  return (
    <div className={cn(rightSlot && "flex items-center justify-between gap-4")}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          {title}
        </h2>
        {description && (
          <p className="text-cream-muted font-[family-name:var(--font-body)]">{description}</p>
        )}
      </div>
      {rightSlot}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

interface LeaderboardSkeletonProps {
  rows?: number;
}

export function LeaderboardSkeleton({ rows = 5 }: LeaderboardSkeletonProps) {
  return (
    <Card className="bg-card border-white/5 overflow-hidden">
      <CardContent className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Skeleton className="w-8 sm:w-10 h-8 shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <Skeleton className="h-6 w-16 ml-auto" />
              <Skeleton className="h-2 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────────

interface LeaderboardErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function LeaderboardError({
  message = "Failed to load leaderboard.",
  onRetry,
}: LeaderboardErrorProps) {
  return (
    <Card className="bg-card border-white/5">
      <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground uppercase font-black text-xs tracking-wide">
          {message}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Controls Bar ───────────────────────────────────────────────────────────

interface LeaderboardControlsBarProps {
  sortOptions: { value: string; label: string }[];
  sortValue: string;
  onSortChange: (v: string) => void;
  filterOptions?: { value: string; label: string }[];
  filterValue?: string;
  onFilterChange?: (v: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
}

export function LeaderboardControlsBar({
  sortOptions,
  sortValue,
  onSortChange,
  filterOptions,
  filterValue,
  onFilterChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search…",
}: LeaderboardControlsBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center px-3 sm:px-6 py-2.5 border-b border-white/5">
      <div className="flex gap-2 flex-1">
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground w-full sm:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterOptions && onFilterChange && filterValue !== undefined && (
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground w-full sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {searchQuery !== undefined && onSearchChange && (
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-xs max-w-xs"
        />
      )}
    </div>
  );
}
