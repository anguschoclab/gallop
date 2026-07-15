import { formatCurrency } from "@/core/common/formatting";
import type { HorseCareerValuation } from "@/core/horse/pricing";
import { cn } from "@/lib/cn";

interface CareerValuationBreakdownProps {
  valuation: HorseCareerValuation;
  className?: string;
}

const ROWS: { key: keyof HorseCareerValuation; label: string; highlight?: boolean }[] = [
  { key: "racing", label: "Racing" },
  { key: "breeding", label: "Breeding" },
  { key: "current", label: "Current", highlight: true },
  { key: "preCareer", label: "Pre-Career" },
  { key: "postCareer", label: "Post-Career" },
];

export function CareerValuationBreakdown({ valuation, className }: CareerValuationBreakdownProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {ROWS.map(({ key, label, highlight }) => (
        <div
          key={key}
          className={cn(
            "flex items-center justify-between text-sm",
            highlight && "border-t border-white/10 pt-1 mt-1",
          )}
        >
          <span className={cn("text-muted-foreground", highlight && "font-semibold text-cream")}>
            {label}
          </span>
          <span
            className={cn(
              "tabular-nums",
              highlight ? "font-bold text-gold" : "font-medium text-cream/80",
            )}
          >
            {formatCurrency(valuation[key])}
          </span>
        </div>
      ))}
    </div>
  );
}
