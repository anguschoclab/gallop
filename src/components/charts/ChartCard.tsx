/**
 * ChartCard.tsx - Shell for every chart in the modern-analytics kit.
 * Rounded, subtle border, hover lifts border toward --chart-1.
 */
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  footnote?: ReactNode;
  href?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  trailing,
  footnote,
  href,
  className,
  bodyClassName,
  children,
}: ChartCardProps) {
  const inner = (
    <div
      className={cn(
        "group relative h-full flex flex-col rounded-xl border border-white/5 bg-card/40",
        "backdrop-blur-sm transition-colors duration-200",
        "hover:border-[color-mix(in_oklab,var(--chart-1)_60%,transparent)]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-cream/70 truncate">
            {title}
          </h3>
          {subtitle ? (
            <div className="mt-1 text-cream font-mono text-lg leading-tight tabular-nums">
              {subtitle}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {trailing}
          {href ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-cream/30 group-hover:text-[var(--chart-1)] transition-colors" />
          ) : null}
        </div>
      </header>
      <div className={cn("flex-1 min-h-0 px-2 pb-2", bodyClassName)}>{children}</div>
      {footnote ? (
        <div className="px-4 pb-3 pt-1 text-[10px] font-mono uppercase tracking-wider text-cream/40">
          {footnote}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chart-1)] rounded-xl">
        {inner}
      </Link>
    );
  }
  return inner;
}
