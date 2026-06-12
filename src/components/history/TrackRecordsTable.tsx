import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";
import { formatTime } from "@/core/common/formatting";

export function TrackRecordsTable({ records }: { records: any[] }) {
  if (records.length === 0) {
    return (
      <Card className="bg-card border-white/5">
        <CardContent className="py-12 text-center text-muted-foreground uppercase font-black text-xs tracking-widest">
          No track records set yet. Records are established by winning horses.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-white/5 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-white/5">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Timer className="text-primary" />
          All-Time Track Records
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-white/5">
              <tr>
                <th className="px-6 py-3">Track</th>
                <th className="px-6 py-3">Surface</th>
                <th className="px-6 py-3">Distance</th>
                <th className="px-6 py-3 text-right">Time</th>
                <th className="px-6 py-3">Holder</th>
                <th className="px-6 py-3 text-right">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((record: any) => (
                <tr
                  key={`${record.trackId}_${record.surface}_${record.distance}`}
                  className="hover:bg-primary/5 transition-colors group"
                >
                  <td className="px-6 py-4 font-bold uppercase tracking-tight group-hover:text-gold transition-colors">
                    {record.trackName}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                        record.surface === "Turf"
                          ? "bg-green-500/20 text-green-500"
                          : record.surface === "Dirt"
                            ? "bg-amber-900/30 text-amber-600"
                            : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      {record.surface}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs tabular-nums font-bold">{record.distance}m</td>
                  <td className="px-6 py-4 text-right font-black tabular-nums text-primary group-hover:text-gold transition-colors">
                    {formatTime(record.time)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold uppercase tracking-tighter">
                    {record.horseName}
                  </td>
                  <td className="px-6 py-4 text-right text-xs tabular-nums text-muted-foreground">
                    Year {record.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
