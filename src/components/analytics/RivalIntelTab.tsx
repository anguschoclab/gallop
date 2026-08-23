import { useGameWithShallow, useGame } from "@/game/store";
import type { Stable } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Swords,
  Globe,
  Target,
  AlertTriangle,
} from "lucide-react";
import type { NpcAIManager, DifficultyState } from "@/core/ai/npcCycleAI";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import { EconomicIndicators } from "@/components/analytics/EconomicIndicators";
import { StorylinesTab } from "@/components/briefing/StorylinesTab";
import { cn } from "@/lib/cn";

export function RivalIntelTab() {
  const manager = useGameWithShallow((s) => s.npcAIManager as NpcAIManager | undefined);
  const npcStables = useGame((s) => s.npcStables);
  const stableMap = new Map<string, Stable>((npcStables ?? []).map((s) => [s.id, s]));

  if (!manager) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="font-display text-2xl text-cream">Rival Intelligence</h2>
          <p className="text-cream-muted mt-1 text-sm">No AI intelligence data available yet.</p>
        </header>
      </div>
    );
  }

  const dm = manager.difficultyModulator;
  const cartels = manager.activeCartels ?? [];
  const stableStates = manager.stableStates ?? {};

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-cream">Rival Intelligence</h2>
        <p className="text-cream-muted mt-1 text-sm">
          AI subsystem telemetry — difficulty, economy, diplomacy, narratives, and strategic
          directives.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dm && (
          <DifficultyPanel dm={dm} previousMultiplier={manager.previousDifficultyMultiplier} />
        )}
        <EconomicIndicators />
        <CartelsPanel cartels={cartels} stableMap={stableMap} />
        <NpcDistressMonitorPanel stableStates={stableStates} stableMap={stableMap} />
        <WorldAssessmentPanel stableStates={stableStates} />
        <StrategicDirectivesPanel stableStates={stableStates} />
        <NpcRelationshipsPanel stableStates={stableStates} stableMap={stableMap} />
        <NpcStableIntelPanel stableStates={stableStates} stableMap={stableMap} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gold/60">
          Active Storylines
        </h3>
        <StorylinesTab />
      </div>
    </div>
  );
}

function DifficultyPanel({
  dm,
  previousMultiplier,
}: {
  dm: DifficultyState;
  previousMultiplier?: number;
}) {
  const current = dm.npcCompetenceMultiplier;
  const prev = previousMultiplier ?? current;
  const trendIcon =
    current > prev + 0.01 ? (
      <TrendingUp className="h-3 w-3 text-red-400" />
    ) : current < prev - 0.01 ? (
      <TrendingDown className="h-3 w-3 text-green-400" />
    ) : (
      <Minus className="h-3 w-3 text-cream-muted" />
    );
  const trendLabel =
    current > prev + 0.01 ? "rising" : current < prev - 0.01 ? "falling" : "stable";

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <TrendingUp size={14} />
          Difficulty Modulator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
              Player Win Rate
            </span>
            <p className="text-cream font-mono">{(dm.playerWinRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
              NPC Competence
            </span>
            <p className="text-cream font-mono flex items-center gap-1">
              {(current * 100).toFixed(0)}%{trendIcon}
            </p>
          </div>
          <div>
            <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
              Player Wins
            </span>
            <p className="text-cream font-mono">{dm.playerWins}</p>
          </div>
          <div>
            <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
              Player Entries
            </span>
            <p className="text-cream font-mono">{dm.playerEntries}</p>
          </div>
        </div>
        <div className="text-[10px] font-mono text-cream/30 uppercase">
          Last adjusted: Day {dm.lastAdjustmentDay} · Trend: {trendLabel}
        </div>
      </CardContent>
    </Card>
  );
}

function CartelsPanel({
  cartels,
  stableMap,
}: {
  cartels: NonNullable<NpcAIManager["activeCartels"]>;
  stableMap: Map<string, Stable>;
}) {
  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Swords size={14} />
          Active Cartels
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {cartels.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No active cartels</p>
        ) : (
          cartels.map((c) => (
            <div key={c.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cream font-mono">{c.id}</span>
                <Badge variant="outline" className="text-[9px] border-white/10 text-cream/40">
                  {c.type}
                </Badge>
              </div>
              {c.memberStableIds?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.memberStableIds.map((sid: string) => (
                    <Link
                      key={sid}
                      to="/npc-stables/$stableId"
                      params={{ stableId: sid }}
                      className="text-[9px] font-mono text-blue-400/60 hover:text-blue-400 uppercase tracking-widest"
                    >
                      {stableMap.get(sid)?.name ?? sid}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NpcDistressMonitorPanel({
  stableStates,
  stableMap,
}: {
  stableStates: Record<string, any>;
  stableMap: Map<string, Stable>;
}) {
  const distressed = Object.entries(stableStates)
    .filter(([, s]) => s.financialDistress && s.financialDistress.level !== "healthy")
    .map(([id, s]) => ({ id, ...s.financialDistress }));

  const levelColor: Record<DistressLevel, string> = {
    healthy: "bg-gray-400/10 text-gray-400 border-gray-400/30",
    caution: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    emergency: "bg-orange-400/10 text-orange-400 border-orange-400/30",
    critical: "bg-red-400/10 text-red-400 border-red-400/30",
  };

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <AlertTriangle size={14} />
          NPC Distress Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {distressed.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">All stables financially healthy</p>
        ) : (
          distressed.map((d) => (
            <div key={d.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <Link
                  to="/npc-stables/$stableId"
                  params={{ stableId: d.id }}
                  className="text-cream font-bold hover:text-gold"
                >
                  {stableMap.get(d.id)?.name ?? d.id}
                </Link>
                <Badge
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider border",
                    levelColor[d.level as DistressLevel],
                  )}
                >
                  {d.level}
                </Badge>
              </div>
              <div className="text-[10px] text-cream/30 font-mono">
                Days of cash: {d.daysOfCash?.toFixed(0) ?? "—"}
              </div>
              {d.recommendedActions?.length > 0 && (
                <div className="text-[10px] text-cream/30 font-mono">
                  Actions: {d.recommendedActions.join(", ")}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function WorldAssessmentPanel({ stableStates }: { stableStates: Record<string, any> }) {
  const assessments = Object.entries(stableStates)
    .filter(([, s]) => s.worldAssessment)
    .map(([id, s]) => ({ id, ...s.worldAssessment }));

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Globe size={14} />
          World Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {assessments.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No assessments</p>
        ) : (
          assessments.map((a) => (
            <div key={a.id} className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
                  player strength
                </span>
                <span className="text-cream font-mono">
                  {((a.playerStrength ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              {a.topThreats?.length > 0 && (
                <div className="text-[10px] text-cream/30 font-mono">
                  Top threat: {a.topThreats[0].stableId} (
                  {((a.topThreats[0].threatLevel ?? 0) * 100).toFixed(0)}%)
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function StrategicDirectivesPanel({ stableStates }: { stableStates: Record<string, any> }) {
  const directives = Object.entries(stableStates)
    .filter(([, s]) => s.strategicDirectives?.length > 0)
    .flatMap(([id, s]) => s.strategicDirectives.map((d: any) => ({ stableId: id, ...d })));

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Target size={14} />
          Strategic Directives
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {directives.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No directives</p>
        ) : (
          directives.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-cream font-mono">{d.action}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cream/30 font-mono">{d.stableId}</span>
                <Badge variant="outline" className="text-[9px] border-white/10 text-cream/40">
                  {d.priority}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NpcRelationshipsPanel({
  stableStates,
  stableMap,
}: {
  stableStates: Record<string, any>;
  stableMap: Map<string, Stable>;
}) {
  const stableIds = Object.keys(stableStates).filter((id) => stableMap.has(id));
  const relationships = Object.entries(stableStates)
    .filter(([, s]) => s.npcRelationships)
    .flatMap(([id, s]) =>
      Object.entries(s.npcRelationships).map(([targetId, rel]: [string, any]) => ({
        from: id,
        to: targetId,
        ...rel,
      })),
    );

  const trustMatrix = new Map<string, Map<string, number>>();
  for (const r of relationships) {
    if (!trustMatrix.has(r.from)) trustMatrix.set(r.from, new Map());
    trustMatrix.get(r.from)!.set(r.to, r.trust);
  }

  function trustColor(trust: number): string {
    if (trust >= 50) return "bg-green-400/20 text-green-400";
    if (trust >= 0) return "bg-yellow-400/20 text-yellow-400";
    return "bg-red-400/20 text-red-400";
  }

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Users size={14} />
          NPC Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {relationships.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No relationships</p>
        ) : (
          <>
            {stableIds.length > 1 && (
              <div className="overflow-x-auto">
                <table className="text-[9px] font-mono">
                  <thead>
                    <tr>
                      <th className="p-1 text-left text-cream/30 uppercase"></th>
                      {stableIds.map((sid) => (
                        <th key={sid} className="p-1 text-center text-cream/30 uppercase">
                          {stableMap.get(sid)?.name?.slice(0, 4) ?? sid.slice(0, 4)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stableIds.map((fromId) => (
                      <tr key={fromId}>
                        <td className="p-1 text-left text-cream/30 uppercase">
                          {stableMap.get(fromId)?.name?.slice(0, 4) ?? fromId.slice(0, 4)}
                        </td>
                        {stableIds.map((toId) => {
                          const trust = trustMatrix.get(fromId)?.get(toId);
                          return (
                            <td key={toId} className="p-1 text-center">
                              {trust !== undefined ? (
                                <span
                                  className={cn(
                                    "inline-block px-1 rounded text-[8px]",
                                    trustColor(trust),
                                  )}
                                >
                                  {trust}
                                </span>
                              ) : (
                                <span className="text-cream/10">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="space-y-2">
              {relationships.map((r, i) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-cream font-mono">
                      {stableMap.get(r.from)?.name ?? r.from} → {stableMap.get(r.to)?.name ?? r.to}
                    </span>
                    {r.allianceType && (
                      <Badge variant="outline" className="text-[9px] border-white/10 text-cream/40">
                        {r.allianceType}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-cream/30 font-mono">Trust: {r.trust}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NpcStableIntelPanel({
  stableStates,
  stableMap,
}: {
  stableStates: Record<string, any>;
  stableMap: Map<string, Stable>;
}) {
  const entries = Object.entries(stableStates);

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Activity size={14} />
          NPC Stable Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No stable data</p>
        ) : (
          entries.map(([id, s]) => (
            <div key={id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cream font-bold">{stableMap.get(id)?.name ?? id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-cream/40">
                <div>
                  <span className="uppercase">Friction</span>
                  <p className="text-cream">{s.friction}</p>
                </div>
                <div>
                  <span className="uppercase">Wins vs Player</span>
                  <p className="text-cream">{s.winsAgainstPlayer}</p>
                </div>
                <div>
                  <span className="uppercase">Prestige</span>
                  <p className="text-cream">
                    {Object.entries(s.regionalPrestige ?? {})
                      .map(([r, v]) => `${r}:${v}`)
                      .join(", ") || "—"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
