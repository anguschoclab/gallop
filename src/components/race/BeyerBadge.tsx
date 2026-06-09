import { Badge } from "@/components/ui/badge";

interface BeyerBadgeProps {
  beyer: number;
  showLabel?: boolean;
}

function getBeyerTier(beyer: number): { color: string; label: string } {
  if (beyer >= 100) return { color: "bg-gold text-t950 border-gold", label: "Elite" };
  if (beyer >= 90) return { color: "bg-info text-t950 border-info", label: "Excellent" };
  if (beyer >= 80) return { color: "bg-success text-t950 border-success", label: "Good" };
  if (beyer >= 70) return { color: "bg-warning text-t950 border-warning", label: "Fair" };
  return { color: "bg-t700 text-cream-muted border-gold-muted", label: "Poor" };
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
