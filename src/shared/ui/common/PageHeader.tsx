import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Single primary CTA slot — pass one default-variant Button or Link-styled button. */
  action?: ReactNode;
  /** Secondary actions render beside the primary; use outline/ghost variants. */
  secondaryActions?: ReactNode;
  className?: string;
}

/**
 * Standardized page header: display title, muted subtitle, and a right-aligned
 * action zone holding at most one primary CTA plus secondary actions.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">{subtitle}</p>
        )}
      </div>
      {(action || secondaryActions) && (
        <div className="flex items-center gap-2">
          {secondaryActions}
          {action}
        </div>
      )}
    </div>
  );
}
