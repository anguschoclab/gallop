import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import type { AutoRegisterResult } from "@/core/campaign/autoRegister";

interface Props {
  result: AutoRegisterResult;
  cash: number;
}

export function AutoRegisterSummary({ result, cash }: Props) {
  const hasEntries = result.entries.length > 0;

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {hasEntries ? (
            <>
              <span className="text-primary font-bold">{result.entries.length}</span> horses
              ready for registration
            </>
          ) : (
            <span className="text-muted-foreground">No eligible registrations found</span>
          )}
        </span>
        {result.skipped.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {result.skipped.length} skipped
          </Badge>
        )}
      </div>

      {hasEntries && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-background rounded p-2 text-center">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Cost</div>
            <div className="font-bold text-destructive">{formatCurrency(result.totalCost)}</div>
          </div>
          <div className="bg-background rounded p-2 text-center">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Remaining</div>
            <div className="font-bold text-success">{formatCurrency(result.remainingCash)}</div>
          </div>
          <div className="bg-background rounded p-2 text-center">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Reserve</div>
            <div className="font-bold text-muted-foreground">
              {formatCurrency(cash - result.remainingCash - result.totalCost)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
