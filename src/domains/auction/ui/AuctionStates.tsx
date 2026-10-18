/**
 * AuctionStates.tsx - Loading and error UI states for the auction sale page.
 */
import { AlertTriangle, Loader2, X } from "lucide-react";

export function AuctionLoadingState() {
  return (
    <div role="status" aria-live="polite" className="p-12 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 text-cream/60">
        <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden />
        <p className="font-mono text-xs uppercase tracking-wide">Loading sale catalog…</p>
      </div>

      {/* Skeleton header */}
      <div className="space-y-3">
        <div className="h-10 w-2/3 bg-white/5 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        <div className="lg:col-span-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white/5 rounded animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="lg:col-span-8 space-y-4">
          <div className="h-64 bg-white/5 rounded animate-pulse" />
          <div className="h-32 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface AuctionErrorStateProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
}

export function AuctionErrorState({
  message,
  onDismiss,
  onRetry,
  retryLabel = "Retry",
}: AuctionErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 rounded animate-fade-in"
    >
      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wide text-red-300/80">
          Action Failed
        </p>
        <p className="text-sm text-cream/90 mt-1 break-words">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 border border-gold/40 bg-gold/10 px-3 py-1.5 rounded text-gold uppercase font-mono text-[10px] tracking-wide hover:bg-gold/20 transition-colors"
          >
            {retryLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="text-cream/40 hover:text-cream/80 flex-shrink-0"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
