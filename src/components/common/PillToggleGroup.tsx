/**
 * PillToggleGroup.tsx - Shared pill-style toggle group
 *
 * Consolidates the `FilterGroup` (portfolio) and the track-selector buttons
 * (TrackHistoryTimeline) into one reusable component.
 */

export function PillToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  ariaLabel,
}: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[10px] font-black uppercase tracking-wide text-cream-muted">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1" role="group" aria-label={ariaLabel}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-cream-muted hover:text-cream"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
