import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface DistanceBadgeProps {
  distance: number;
}

export function DistanceBadge({ distance }: DistanceBadgeProps) {
  const pct = Math.round((1 - distance) * 100);
  const cls =
    distance < 0.2
      ? "bg-emerald-800 text-emerald-200"
      : distance < 0.4
        ? "bg-blue-800 text-blue-200"
        : distance < 0.6
          ? "bg-amber-800 text-amber-200"
          : "bg-t700 text-cream-muted";
  return (
    <Badge className={cn("font-[family-name:var(--font-mono)] tabular-nums text-xs", cls)}>
      {pct}% match
    </Badge>
  );
}
