import { cn } from "@/lib/utils";

/**
 * VisualTrophy — a stylised SVG trophy cup used to celebrate
 * yearly awards (Horse of the Year, divisional champ) and G1 wins.
 *
 * Variants:
 *   - "gold"    → G1 wins / Horse of the Year
 *   - "silver"  → G2 / placings
 *   - "bronze"  → G3
 *   - "platinum"→ Triple Crown / historic
 */

export type TrophyTone = "gold" | "silver" | "bronze" | "platinum";

const TONE_STOPS: Record<TrophyTone, { top: string; mid: string; low: string; rim: string }> = {
  gold: { top: "#fff3b0", mid: "#f5c542", low: "#a37418", rim: "#7a4f0c" },
  silver: { top: "#f5f7fa", mid: "#c8cdd4", low: "#6b7280", rim: "#3f4753" },
  bronze: { top: "#f1c79a", mid: "#c97a3a", low: "#7a3f15", rim: "#4a230a" },
  platinum: { top: "#ffffff", mid: "#d6e6f5", low: "#7a93ab", rim: "#3a4a5a" },
};

interface VisualTrophyProps {
  tone?: TrophyTone;
  size?: number;
  label?: string; // small text on the plaque (e.g. "G1", "HOTY")
  sublabel?: string; // smaller (e.g. year "Y12")
  flag?: string; // optional emoji flag rendered next to label
  shine?: boolean; // animated shimmer
  className?: string;
  title?: string;
}

export function VisualTrophy({
  tone = "gold",
  size = 72,
  label,
  sublabel,
  flag,
  shine = true,
  className,
  title,
}: VisualTrophyProps) {
  const c = TONE_STOPS[tone];
  const gradId = `vt-${tone}-grad`;
  const rimId = `vt-${tone}-rim`;

  return (
    <div
      className={cn("inline-flex flex-col items-center select-none", className)}
      style={{ width: size }}
      title={title}
    >
      <svg
        viewBox="0 0 64 80"
        width={size}
        height={size}
        className={cn("drop-shadow-md", shine && "trophy-shine")}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.top} />
            <stop offset="45%" stopColor={c.mid} />
            <stop offset="100%" stopColor={c.low} />
          </linearGradient>
          <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.mid} />
            <stop offset="100%" stopColor={c.rim} />
          </linearGradient>
        </defs>

        {/* Handles */}
        <path
          d="M14 20 Q4 24 8 38 Q10 46 18 46"
          fill="none"
          stroke={`url(#${rimId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M50 20 Q60 24 56 38 Q54 46 46 46"
          fill="none"
          stroke={`url(#${rimId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Cup body */}
        <path
          d="M14 16 H50 V32 Q50 50 32 52 Q14 50 14 32 Z"
          fill={`url(#${gradId})`}
          stroke={c.rim}
          strokeWidth="1"
        />
        {/* Rim */}
        <rect x="12" y="14" width="40" height="4" rx="1.5" fill={`url(#${rimId})`} />

        {/* Shine highlight */}
        <path
          d="M20 22 Q22 34 26 44"
          stroke={c.top}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Stem */}
        <rect x="29" y="52" width="6" height="8" fill={`url(#${rimId})`} />
        {/* Base */}
        <rect x="20" y="60" width="24" height="5" rx="1.5" fill={`url(#${rimId})`} />
        <rect x="16" y="65" width="32" height="6" rx="2" fill={c.rim} />

        {/* Plaque */}
        {(label || sublabel) && (
          <g>
            <rect x="20" y="66" width="24" height="4" rx="0.5" fill="#1a1109" opacity="0.5" />
          </g>
        )}
      </svg>

      {(label || sublabel || flag) && (
        <div className="-mt-1.5 text-center leading-tight">
          {label && (
            <div className="text-[10px] font-bold tracking-wide text-foreground/90 flex items-center justify-center gap-1">
              {flag && <span>{flag}</span>}
              <span>{label}</span>
            </div>
          )}
          {sublabel && (
            <div className="text-[9px] text-muted-foreground tabular-nums">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * TrophyShelf — renders a horizontal row of VisualTrophy items on a
 * wooden shelf with subtle perspective. Used for G1 race wins and HOTY.
 */
interface TrophyShelfProps {
  children: React.ReactNode;
  className?: string;
  empty?: React.ReactNode;
  count?: number;
}

export function TrophyShelf({ children, className, empty, count }: TrophyShelfProps) {
  const hasChildren = count === undefined ? true : count > 0;
  return (
    <div className={cn("relative", className)}>
      <div className="flex items-end gap-3 overflow-x-auto pb-1 px-2 pt-2 min-h-[88px]">
        {hasChildren ? (
          children
        ) : (
          <div className="text-xs text-muted-foreground italic px-2 py-4">
            {empty ?? "No trophies yet."}
          </div>
        )}
      </div>
      {/* Shelf */}
      <div className="h-2 rounded-sm bg-gradient-to-b from-amber-900/60 to-amber-950/80 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]" />
      <div className="h-1 rounded-b-sm bg-amber-950/70" />
    </div>
  );
}
