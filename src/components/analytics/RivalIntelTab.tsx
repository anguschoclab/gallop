import { useGameWithShallow, useGame } from "@/game/store";
import type { Stable } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  TrendingUp,
  Users,
  Swords,
  Globe,
  Target,
  Drama,
  DollarSign,
} from "lucide-react";
import type { NpcAIManager, DifficultyState } from "@/core/ai/npcCycleAI";

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
  const economicState = manager.globalEconomicState;
  const cartels = manager.activeCartels ?? [];
  const arcs = manager.narrativeArcs ?? [];
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
        {dm && <DifficultyPanel dm={dm} />}
        {economicState && <EconomyPanel trend={economicState} />}
        <CartelsPanel cartels={cartels} />
        <NarrativeArcsPanel arcs={arcs} />
        <WorldAssessmentPanel stableStates={stableStates} />
        <StrategicDirectivesPanel stableStates={stableStates} />
        <NpcRelationshipsPanel stableStates={stableStates} stableMap={stableMap} />
        <NpcStableIntelPanel stableStates={stableStates} stableMap={stableMap} />
      </div>
    </div>
  );
}

function DifficultyPanel({ dm }: { dm: DifficultyState }) {
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
            <p className="text-cream font-mono">{(dm.npcCompetenceMultiplier * 100).toFixed(0)}%</p>
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
          Last adjusted: Day {dm.lastAdjustmentDay}
        </div>
      </CardContent>
    </Card>
  );
}

function EconomyPanel({ trend }: { trend: NonNullable<NpcAIManager["globalEconomicState"]> }) {
  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <DollarSign size={14} />
          Economic State
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
            Stud Fee Trend
          </span>
          <span className="text-cream font-mono">{trend.studFeeTrend?.toFixed(1) ?? "—"}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
            Yearling Price Index
          </span>
          <span className="text-cream font-mono">
            {trend.yearlingPriceIndex?.toFixed(1) ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream/40 uppercase text-[10px] font-black tracking-widest">
            Claiming Activity
          </span>
          <span className="text-cream font-mono">
            {trend.claimingMarketActivity?.toFixed(0) ?? "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CartelsPanel({ cartels }: { cartels: NonNullable<NpcAIManager["activeCartels"]> }) {
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
            <div key={c.id} className="flex items-center justify-between text-xs">
              <span className="text-cream font-mono">{c.id}</span>
              <Badge variant="outline" className="text-[9px] border-white/10 text-cream/40">
                {c.type}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NarrativeArcsPanel({ arcs }: { arcs: NonNullable<NpcAIManager["narrativeArcs"]> }) {
  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Drama size={14} />
          Narrative Arcs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {arcs.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No active arcs</p>
        ) : (
          arcs.map((arc) => (
            <div key={arc.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cream font-mono">{arc.type}</span>
                <Badge variant="outline" className="text-[9px] border-white/10 text-cream/40">
                  {arc.status}
                </Badge>
              </div>
              <div className="text-[10px] text-cream/30 font-mono">
                Stable {arc.stableId} · Started Day {arc.startDay}
              </div>
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
  const relationships = Object.entries(stableStates)
    .filter(([, s]) => s.npcRelationships)
    .flatMap(([id, s]) =>
      Object.entries(s.npcRelationships).map(([targetId, rel]: [string, any]) => ({
        from: id,
        to: targetId,
        ...rel,
      })),
    );

  return (
    <Card className="border-gold/20 bg-slate-900/40">
      <CardHeader className="border-b border-gold/10 pb-3">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Users size={14} />
          NPC Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {relationships.length === 0 ? (
          <p className="text-[11px] text-cream/40 font-mono">No relationships</p>
        ) : (
          relationships.map((r, i) => (
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
          ))
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
