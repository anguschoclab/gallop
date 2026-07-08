/**
 * PersonRaceHistoryTab.tsx
 *
 * Reusable race history list for a "person" (jockey, trainer, owner, etc).
 * Scans every horse's raceHistory and surfaces entries where the person
 * participated in the given role.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useGameWithShallow } from "@/game/store";
import { useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gradeColor } from "@/core/common/uiTokens";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { History } from "lucide-react";
import { cn } from "@/lib/cn";

export type PersonRole = "jockey" | "trainer" | "owner";

interface PersonRaceHistoryTabProps {
  personId: string;
  roles: PersonRole[];
}

interface Row {
  horse: Horse;
  entry: Horse["raceHistory"][number];
  role: PersonRole;
}

export function PersonRaceHistoryTab({ personId, roles }: PersonRaceHistoryTabProps) {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const staff = useGameWithShallow((s: GameState) => (s as any).staff ?? []);

  // Trainer role: find stables where this staff member is/was a trainer.
  const trainerStableIds = useMemo(() => {
    if (!roles.includes("trainer")) return new Set<string>();
    return new Set(
      (staff as any[])
        .filter((m) => m.id === personId && (m.role === "trainer" || m.type === "trainer"))
        .map((m) => m.stableId)
        .filter(Boolean),
    );
  }, [roles, staff, personId]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const horse of horses ?? []) {
      for (const entry of horse.raceHistory ?? []) {
        if (roles.includes("jockey") && entry.jockeyId === personId) {
          out.push({ horse, entry, role: "jockey" });
          continue;
        }
        if (roles.includes("owner") && entry.stableId === personId) {
          out.push({ horse, entry, role: "owner" });
          continue;
        }
        if (
          roles.includes("trainer") &&
          entry.stableId &&
          trainerStableIds.has(entry.stableId)
        ) {
          out.push({ horse, entry, role: "trainer" });
        }
      }
    }
    return out.sort((a, b) => b.entry.day - a.entry.day);
  }, [horses, personId, roles, trainerStableIds]);

  const stats = useMemo(() => {
    const starts = rows.length;
    const wins = rows.filter((r) => r.entry.position === 1).length;
    const podium = rows.filter((r) => r.entry.position <= 3).length;
    return { starts, wins, podium, winRate: starts ? (wins / starts) * 100 : 0 };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="Starts" value={stats.starts} />
        <StatBox label="Wins" value={stats.wins} />
        <StatBox label="Podium" value={stats.podium} />
        <StatBox label="Win %" value={`${stats.winRate.toFixed(1)}%`} />
      </div>

      <Card className="bg-slate-900/40 border-white/5 rounded-none border-l-4 border-l-gold">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-cream">
            <History className="h-4 w-4 text-gold" />
            Race History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-[10px] font-mono text-cream/30 uppercase tracking-widest italic">
              No race records on file.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {rows.map(({ horse, entry, role }, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center p-3 hover:bg-white/[0.02] transition-colors text-xs"
                >
                  <span
                    className={cn(
                      "font-black font-mono w-6 text-center",
                      entry.position === 1
                        ? "text-gold"
                        : entry.position <= 3
                          ? "text-cream/70"
                          : "text-cream/30",
                    )}
                  >
                    {entry.position}
                    <span className="text-[9px]">{getOrdinalSuffix(entry.position)}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-cream truncate">{entry.raceName}</div>
                    <div className="text-[10px] font-mono text-cream/40 flex gap-2">
                      <span>Day {entry.day}</span>
                      {entry.distance && <span>· {entry.distance}m</span>}
                      {entry.surface && <span>· {entry.surface}</span>}
                    </div>
                  </div>
                  <Link
                    to="/horse/$horseId"
                    params={{ horseId: horse.id }}
                    className="text-[11px] text-gold hover:underline truncate max-w-[140px]"
                  >
                    {horse.name}
                  </Link>
                  <Badge variant="outline" className="text-[9px] rounded-none uppercase">
                    {role}
                  </Badge>
                  {entry.grade ? (
                    <Badge variant="outline" className={cn("text-[9px] rounded-none", gradeColor(entry.grade))}>
                      {entry.grade}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  {typeof entry.beyer === "number" ? (
                    <span className="font-mono text-[10px] text-gold-bright">{entry.beyer}</span>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/5 bg-slate-900/40 p-3 text-center">
      <div className="text-[9px] font-mono uppercase tracking-widest text-cream/40">{label}</div>
      <div className="text-lg font-black text-cream mt-1">{value}</div>
    </div>
  );
}
