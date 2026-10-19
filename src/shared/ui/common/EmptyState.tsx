import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/shared/lib/cn";
import { Button, buttonVariants } from "@/shared/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Single primary call-to-action rendered as a default Button. */
  action?: {
    label: string;
    onClick?: () => void;
    /** Rendered inside a TanStack Link when provided (takes precedence over onClick). */
    to?: string;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * Standardized empty state: icon chip, heading, optional subtitle, and at most
 * one primary CTA. Use on every screen's no-data branch instead of ad-hoc
 * empty markup.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  const cta = action ? (
    action.to ? (
      <Link to={action.to} className={cn(buttonVariants(), "mt-4")} onClick={action.onClick}>
        {action.label}
      </Link>
    ) : (
      <Button className="mt-4" onClick={action.onClick}>
        {action.label}
      </Button>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-display)]">
        {title}
      </h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {cta}
      {children}
    </div>
  );
}
