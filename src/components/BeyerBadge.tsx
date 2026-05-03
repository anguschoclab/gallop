import { Badge } from "@/components/ui/badge";

interface BeyerBadgeProps {
  beyer: number;
  showLabel?: boolean;
}

function getBeyerTier(beyer: number): { color: string; label: string } {
  if (beyer >= 100) return { color: "bg-purple-500/15 text-purple-700 border-purple-500/30", label: "Elite" };
  if (beyer >= 90) return { color: "bg-blue-500/15 text-blue-700 border-blue-500/30", label: "Excellent" };
  if (beyer >= 80) return { color: "bg-green-500/15 text-green-700 border-green-500/30", label: "Good" };
  if (beyer >= 70) return { color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", label: "Fair" };
  return { color: "bg-gray-500/15 text-gray-700 border-gray-500/30", label: "Poor" };
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
