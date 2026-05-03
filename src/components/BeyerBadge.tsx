import { Badge } from "@/components/ui/badge";
import { getBeyerTier } from "@/game/beyer";

interface BeyerBadgeProps {
  beyer: number;
  showLabel?: boolean;
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
