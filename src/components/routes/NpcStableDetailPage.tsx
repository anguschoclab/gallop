import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Globe, Briefcase } from "lucide-react";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { NumericValue } from "@/components/horse/HorseBits";
import { formatCurrency } from "@/core/common/formatting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivateSaleOfferDialog } from "@/components/auction/PrivateSaleOfferDialog";
import { PersonRaceHistoryTab } from "@/components/person/PersonRaceHistoryTab";
import { useGame } from "@/game/store";
import { useNpcStableDetail } from "@/hooks/stable/useNpcStableDetail";
import { NpcStableOverviewTab } from "@/components/stable/NpcStableOverviewTab";
import { NpcStableRosterTab } from "@/components/stable/NpcStableRosterTab";
import { NpcStableInfoSidebar } from "@/components/stable/NpcStableInfoSidebar";
import { DiplomacyPanel } from "@/components/npc/DiplomacyPanel";
import { RelationshipGraph } from "@/components/npc/RelationshipGraph";
import { AIPersonalityCard } from "@/components/npc/AIPersonalityCard";
import { StrategicDirectivesPanel } from "@/components/npc/StrategicDirectivesPanel";
import { FinancialDistressIndicator } from "@/components/npc/FinancialDistressIndicator";

function NpcStableDetailPage() {
  const { stableId } = useParams({ from: "/npc-stables/$stableId" });
  const { tab } = useSearch({ from: "/npc-stables/$stableId" });
  const navigate = useNavigate({ from: "/npc-stables/$stableId" });
  const pageData = useNpcStableDetail(stableId);
  const { stable, offerHorse, setOfferHorse, cash, horses } = pageData;
  const hiredStaff = useGame((s) => s.hiredStaff);
  const npcAIManager = useGame((s) => s.npcAIManager);
  const npcStables = useGame((s) => s.npcStables);

  const aiRelationships = useMemo(
    () => npcAIManager?.stableStates?.[stableId]?.npcRelationships ?? {},
    [npcAIManager, stableId],
  );
  const aiCartels = useMemo(() => npcAIManager?.activeCartels, [npcAIManager]);

  const trainerStaffId = useMemo(
    () => (hiredStaff ?? []).find((m) => m.role === "trainer" && m.stableId === stableId)?.id,
    [hiredStaff, stableId],
  );

  if (!stable) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-4xl font-black font-[family-name=var(--font-display)] text-cream">
          Stable not found
        </h1>
        <Link
          to="/stable"
          search={{ tab: "rivals" }}
          className="text-blue-400 uppercase font-mono text-xs tracking-wide hover:underline"
        >
          All Stables
        </Link>
      </div>
    );
  }

  const { stableHorses } = pageData;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
        <div>
          <button
            onClick={() => navigate({ to: "/stable", search: { tab: "rivals" } })}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-cream/30 hover:text-blue-400 transition-colors mb-4"
          >
            <ArrowLeft className="h-3 w-3" /> Stables
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-10 h-10 rounded-sm rotate-45 border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0"
              style={{ backgroundColor: stable.colors.primary }}
            />
            <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name=var(--font-display)] uppercase text-left">
              {stable.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wide text-cream/40">
            <span>
              <Globe className="h-3 w-3 inline mr-1" />
              {stable.country}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Horses: <NumericValue value={stableHorses.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Type: {stable.personality}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <BookmarkButton
            type="stable"
            id={stable.id}
            label={stable.name}
            subtitle={`${stable.country} · ${stable.personality}`}
            variant="full"
          />
          <div className="text-[10px] font-mono text-cream/20 uppercase tracking-wide">
            Liquid Capital
          </div>
          <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
            {formatCurrency(stable.cash)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Main Content */}
        <div className="space-y-6 min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              navigate({
                search: { tab: v as "overview" | "roster" | "history" | "ai-profile" },
              })
            }
            className="space-y-6"
          >
            <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
              <TabsList className="bg-transparent h-10 gap-2">
                <TabsTrigger
                  value="overview"
                  className="gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="roster"
                  className="gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Roster
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="ai-profile"
                  className="gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Personality
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="overview"
              className="mt-0 space-y-6 animate-in fade-in duration-300"
            >
              <NpcStableOverviewTab stableId={stableId} pageData={pageData} />
            </TabsContent>

            <TabsContent value="roster" className="mt-0 space-y-6 animate-in fade-in duration-300">
              <NpcStableRosterTab pageData={pageData} />
            </TabsContent>

            <TabsContent value="staff" className="mt-0 animate-in fade-in duration-300">
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardHeader className="bg-black/20 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40">
                    Retained Personnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {Object.entries(stable.staff || {}).map(([role, name]) => (
                      <div
                        key={role}
                        className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-[9px] font-black uppercase tracking-wide text-cream/40 flex items-center gap-2">
                          <Briefcase className="h-3 w-3" /> {role.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-cream uppercase text-right">
                          {name || <span className="italic text-cream/20 font-mono">Vacant</span>}
                        </span>
                      </div>
                    ))}
                    {(!stable.staff || Object.keys(stable.staff).length === 0) && (
                      <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic">
                        No personnel records found.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {trainerStaffId && (
                <div className="mt-6">
                  <PersonRaceHistoryTab personId={trainerStaffId} roles={["trainer"]} />
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="ai-profile"
              className="mt-0 space-y-6 animate-in fade-in duration-300"
            >
              {npcAIManager?.stableStates?.[stableId] ? (
                <>
                  <AIPersonalityCard stableAI={npcAIManager.stableStates[stableId]} />
                  <StrategicDirectivesPanel
                    directives={npcAIManager.stableStates[stableId].strategicDirectives}
                  />
                </>
              ) : (
                <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
                  <CardContent className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic">
                    No data yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-in fade-in duration-300">
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardHeader className="bg-black/20 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40">
                    Entity Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-wide text-cream/40">
                        Established
                      </span>
                      <span className="font-mono text-xs text-cream tabular-nums">
                        {stable.founded}
                      </span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-wide text-cream/40">
                        Reputation
                      </span>
                      <span className="font-mono text-xs text-fame tabular-nums">
                        {stable.reputation}
                      </span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-wide text-cream/40">
                        Cash on Hand
                      </span>
                      <span className="font-mono text-xs text-success tabular-nums">
                        {formatCurrency(stable.cash)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6">
                <PersonRaceHistoryTab personId={stable.id} roles={["owner"]} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <NpcStableInfoSidebar stableId={stableId} pageData={pageData} navigate={navigate} />
        <FinancialDistressIndicator
          distress={npcAIManager?.stableStates?.[stableId]?.financialDistress}
        />
        <DiplomacyPanel stableId={stableId} />
        <RelationshipGraph
          stableId={stableId}
          relationships={aiRelationships}
          stables={npcStables}
          cartels={aiCartels}
        />
      </div>

      {offerHorse && (
        <PrivateSaleOfferDialog
          horse={offerHorse}
          stable={stable!}
          isOpen={!!offerHorse}
          onClose={() => setOfferHorse(null)}
          cash={cash}
          allHorses={Object.values(horses)}
        />
      )}
    </div>
  );
}

export default NpcStableDetailPage;
