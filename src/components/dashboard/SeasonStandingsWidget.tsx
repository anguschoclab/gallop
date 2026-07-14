import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { useGame } from "@/game/store";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import { Trophy } from "lucide-react";

const PLAYER_ID = "__player__";
const WINDOW_DAYS = 30;

interface Standing {
  id: string;
  name: string;
  isPlayer: boolean;
  silkColor?: string;
  seasonEarnings: number;
  daily: number[]; // length WINDOW_DAYS, oldest → newest
  prestige: number; // sum of regional prestige (NPCs only)
  winsVsPlayer: number;
}

function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const w = 80;
  const h = 20;
  const max = Math.max(1, ...data);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const cls = positive ? "stroke-success" : "stroke-cream/40";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        points={points}
      />
    </svg>
  );
}

export function SeasonStandingsWidget() {
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const npcStables = useGame((s) => s.npcStables);
  const npcAIManager = useGame((s) => (s as any).npcAIManager);
  const playerProfile = useGame((s) => (s as any).playerProfile);

  const standings = useMemo<Standing[]>(() => {
    const windowStart = day - WINDOW_DAYS + 1;
    const totals = new Map<string, { season: number; daily: number[] }>();

    const bucket = (id: string) => {
      let b = totals.get(id);
      if (!b) {
        b = { season: 0, daily: new Array(WINDOW_DAYS).fill(0) };
        totals.set(id, b);
      }
      return b;
    };

    for (const h of Object.values(horses) as any[]) {
      for (const r of h.raceHistory ?? []) {
        const earned = r.purseEarned ?? 0;
        if (!earned) continue;
        // NPC horses have stableId; player horses do not.
        const key = r.stableId || (h.owned ? PLAYER_ID : null);
        if (!key) continue;
        const b = bucket(key);
        if (r.day >= windowStart && r.day <= day) {
          const idx = Math.min(WINDOW_DAYS - 1, Math.max(0, r.day - windowStart));
          b.daily[idx] += earned;
          b.season += earned;
        }
      }
    }

    const list: Standing[] = [];

    // Player
    const playerBucket = totals.get(PLAYER_ID);
    list.push({
      id: PLAYER_ID,
      name: playerProfile?.stableName ?? "Your stable",
      isPlayer: true,
      silkColor: playerProfile?.silk?.primary,
      seasonEarnings: playerBucket?.season ?? 0,
      daily: playerBucket?.daily ?? new Array(WINDOW_DAYS).fill(0),
      prestige: 0,
      winsVsPlayer: 0,
    });

    // NPCs
    for (const s of npcStables ?? []) {
      const b = totals.get(s.id);
      const ai = npcAIManager?.stableStates?.[s.id];
      const prestige = ai?.regionalPrestige
        ? Object.values(ai.regionalPrestige).reduce(
            (acc: number, v: any) => acc + (Number(v) || 0),
            0,
          )
        : 0;
      list.push({
        id: s.id,
        name: s.name,
        isPlayer: false,
        silkColor: s.colors?.primary,
        seasonEarnings: b?.season ?? 0,
        daily: b?.daily ?? new Array(WINDOW_DAYS).fill(0),
        prestige,
        winsVsPlayer: ai?.winsAgainstPlayer ?? 0,
      });
    }

    list.sort((a, b) => b.seasonEarnings - a.seasonEarnings);
    return list;
  }, [day, horses, npcStables, npcAIManager, playerProfile]);

  const playerRank = standings.findIndex((s) => s.isPlayer) + 1;
  const top10 = standings.slice(0, 10);
  const playerInTop = top10.some((s) => s.isPlayer);
  const rows = playerInTop ? top10 : [...top10, standings[playerRank - 1]];

  return (
    <Card className="border-gold-muted bg-slate-900/20 group hover:border-gold/40 transition-all duration-300 lg:col-span-6">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:bg-gold/20 transition-colors">
            <Trophy className="h-4 w-4 text-gold" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            Season Standings
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="border-gold/30 text-gold-muted bg-gold/5 font-mono tracking-widest text-[10px] uppercase h-5"
        >
          You: #{playerRank || "—"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-3">
        {standings.length === 0 ? (
          <p className="text-xs text-cream/30 italic text-center py-6">
            No prize money earned yet this season.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/40 border-b border-white/5">
                <th className="py-2 px-2 w-8 text-right">#</th>
                <th className="py-2 px-2 text-left">Stable</th>
                <th className="py-2 px-2 text-right">30D Earnings</th>
                <th className="py-2 px-2 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((s, i) => {
                if (!s) return null;
                const rank = s.isPlayer && !playerInTop ? playerRank : i + 1;
                const showDivider = s.isPlayer && !playerInTop && i === top10.length;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "transition-colors",
                      s.isPlayer
                        ? "bg-gold/10 hover:bg-gold/15"
                        : "hover:bg-white/[0.02]",
                      showDivider && "border-t-2 border-dashed border-white/10",
                    )}
                  >
                    <td
                      className={cn(
                        "py-2 px-2 text-right font-mono tabular-nums text-xs",
                        rank === 1 ? "text-fame font-black" : "text-cream/50",
                      )}
                    >
                      {rank}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {s.silkColor && <SilkDot color={s.silkColor} size="sm" />}
                        <span
                          className={cn(
                            "text-xs truncate max-w-[180px]",
                            s.isPlayer
                              ? "font-black text-gold"
                              : "font-medium text-cream/80",
                          )}
                        >
                          {s.name}
                        </span>
                        {!s.isPlayer && s.winsVsPlayer > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 border-destructive/40 text-destructive"
                            title="Recent wins against you"
                          >
                            ×{s.winsVsPlayer}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-xs text-cream/80">
                      {formatCurrency(s.seasonEarnings)}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex justify-end">
                        <Sparkline data={s.daily} positive={s.isPlayer} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
