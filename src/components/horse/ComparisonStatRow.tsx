import { StatBar } from "@/components/horse/HorseBits";

interface ComparisonStatRowProps {
  stat: string;
  v1: number;
  v2: number;
  name1: string;
  name2: string;
}

export function ComparisonStatRow({ stat, v1, v2, name1, name2 }: ComparisonStatRowProps) {
  const diff = v1 - v2;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium capitalize">{stat}</span>
        <span className="text-muted-foreground">
          {diff !== 0 && (
            <span className={diff > 0 ? "text-success" : "text-destructive"}>
              {diff > 0 ? "+" : ""}
              {diff}
            </span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={diff > 0 ? "bg-success/10 rounded p-2" : ""}>
          <div className="text-xs text-muted-foreground mb-1">{name1}</div>
          <StatBar label="" value={v1} />
        </div>
        <div className={diff < 0 ? "bg-success/10 rounded p-2" : ""}>
          <div className="text-xs text-muted-foreground mb-1">{name2}</div>
          <StatBar label="" value={v2} />
        </div>
      </div>
    </div>
  );
}
