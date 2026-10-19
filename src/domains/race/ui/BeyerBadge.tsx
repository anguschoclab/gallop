import { Badge } from "@/shared/ui/badge";

interface BeyerBadgeProps {
  beyer: number;
  showLabel?: boolean;
}

function getBeyerTier(beyer: number): { color: string; label: string } {
  if (beyer >= 100) return { color: "bg-primary text-background border-primary", label: "Elite" };
  if (beyer >= 90) return { color: "bg-info text-background border-info", label: "Excellent" };
  if (beyer >= 80) return { color: "bg-success text-background border-success", label: "Good" };
  if (beyer >= 70) return { color: "bg-warning text-background border-warning", label: "Fair" };
  return { color: "bg-muted text-muted-foreground border-border", label: "Poor" };
}

export function BeyerBadge({ beyer, showLabel = true }: BeyerBadgeProps) {
  const { color, label } = getBeyerTier(beyer);

  return (
    <Badge variant="outline" className={color}>
      {showLabel && <span className="mr-1">{label}</span>}
      <span className="font-bold">{beyer}</span>
    </Badge>
  );
}
