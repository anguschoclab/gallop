import { cn } from "@/lib/utils";

interface SilkDotProps {
  color: string;
  size?: "sm" | "md" | "lg";
  initials?: string;
  className?: string;
}

/**
 * Silk Dot — A colored circle representing a horse's racing silks.
 *
 * Design Bible Spec:
 * - Circular dot beside every horse name
 * - Border: 2px solid rgba(255,255,255,0.4) on dark backgrounds
 * - Border: 2px solid slate on light backgrounds
 * - Used for instant visual identification across all screens
 */
export function SilkDot({ color, size = "md", initials, className }: SilkDotProps) {
  const sizeClasses = {
    sm: "w-4 h-4 text-[8px]",
    md: "w-6 h-6 text-[10px]",
    lg: "w-8 h-8 text-xs",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0",
        "border-2 border-white/40 dark:border-white/40 border-cream-muted/50",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials && <span className="text-white drop-shadow-sm">{initials}</span>}
    </div>
  );
}
