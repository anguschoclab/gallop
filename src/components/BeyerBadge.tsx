import { Badge } from "@/components/ui/badge";

interface BeyerBadgeProps {
  beyer: number;
  showLabel?: boolean;
}

function getBeyerTier(beyer: number): { color: string; label: string } {
  if (beyer >= 100) return { color: "bg-fame/15 text-fame border-fame/30", label: "Elite" };
  if (beyer >= 90) return { color: "bg-info/15 text-info border-info/30", label: "Excellent" };
  if (beyer >= 80) return { color: "bg-success/15 text-success border-success/30", label: "Good" };
  if (beyer >= 70) return { color: "bg-warning/15 text-warning border-warning/30", label: "Fair" };
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
