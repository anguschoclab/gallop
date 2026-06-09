import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting";
import type { AutoRegisterEntry } from "@/game/autoRegister";

interface Props {
  entries: AutoRegisterEntry[];
}

export function AutoRegisterEntriesTable({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto border rounded-md">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0">
          <TableRow>
            <TableHead className="text-[10px] uppercase">Horse</TableHead>
            <TableHead className="text-[10px] uppercase">Race</TableHead>
            <TableHead className="text-[10px] uppercase text-center">Day</TableHead>
            <TableHead className="text-[10px] uppercase">Jockey</TableHead>
            <TableHead className="text-[10px] uppercase text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.horseId} className="text-sm">
              <TableCell className="font-medium">{entry.horseName}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col">
                  <span className="truncate max-w-[150px]">{entry.raceName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center font-mono text-xs">{entry.raceDay}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{entry.jockeyName}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(entry.totalCost)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
