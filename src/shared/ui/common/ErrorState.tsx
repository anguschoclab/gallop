import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Primary recovery action. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Secondary navigation away from the failed view. */
  backTo?: string;
  backLabel?: string;
  className?: string;
}

/**
 * Standardized error state: heading, description, a retry action, and an
 * optional back/home link. Pair with route errorComponent / notFoundComponent.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  retryLabel = "Try again",
  backTo = "/",
  backLabel = "Go home",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-display)]">
        {title}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
