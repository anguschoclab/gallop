import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface SkippedItem {
  horseId: string;
  horseName: string;
  reason: string;
}

interface Props {
  skipped: SkippedItem[];
}

export function AutoRegisterSkippedList({ skipped }: Props) {
  if (skipped.length === 0) return null;

  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium mb-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        {skipped.length} horse{skipped.length > 1 ? "s" : ""} skipped
      </div>
      <div className="space-y-1 max-h-24 overflow-auto">
        {skipped.map((skip) => (
          <div
            key={skip.horseId}
            className="flex items-center justify-between text-xs text-muted-foreground"
          >
            <span>{skip.horseName}</span>
            <Badge variant="secondary" className="text-[9px]">
              {skip.reason}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
