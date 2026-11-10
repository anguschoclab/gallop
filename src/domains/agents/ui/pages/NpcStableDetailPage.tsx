import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { Globe, Briefcase } from "lucide-react";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";
import { NumericValue } from "@/domains/horse/ui/HorseBits";
import { formatCurrency } from "@/shared/common/formatting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { RivalStakesPage } from "@/domains/syndicates/ui/RivalStakesPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PrivateSaleOfferDialog } from "@/domains/auction/ui/PrivateSaleOfferDialog";
import { PersonRaceHistoryTab } from "@/domains/person/ui/PersonRaceHistoryTab";
import { useGame } from "@/platform/game/store";
import { useNpcStableDetail } from "@/domains/stable/application/hooks/useNpcStableDetail";
import { NpcStableCampaignTab } from "@/domains/stable/ui/NpcStableCampaignTab";
import { NpcStableOverviewTab } from "@/domains/stable/ui/NpcStableOverviewTab";
import { NpcStableRosterTab } from "@/domains/stable/ui/NpcStableRosterTab";
import { NpcStableTradingTab } from "@/domains/stable/ui/NpcStableTradingTab";
import { NpcStableInfoSidebar } from "@/domains/stable/ui/NpcStableInfoSidebar";
import { DiplomacyPanel } from "@/domains/agents/ui/DiplomacyPanel";
import { RelationshipGraph } from "@/domains/agents/ui/RelationshipGraph";
import { AIPersonalityCard } from "@/domains/agents/ui/AIPersonalityCard";
import { StrategicDirectivesPanel } from "@/domains/agents/ui/StrategicDirectivesPanel";
import { FinancialDistressIndicator } from "@/domains/agents/ui/FinancialDistressIndicator";
import { BackLink } from "@/shared/ui/charts/BackLink";

type PageData = ReturnType<typeof useNpcStableDetail>;
type Stable = NonNullable<PageData["stable"]>;
type StaffMember = NonNullable<ReturnType<typeof useGame.getState>["hiredStaff"]>[number];

const TAB_TRIGGER_CLASS =
  "gap-2 uppercase text-[10px] font-black tracking-wide data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all";

const TAB_VALUES = [
  ["overview", "Overview"],
  ["roster", "Roster"],
  ["staff", "Staff"],
  ["trading", "Trading"],
  ["history", "History"],
  ["ai-profile", "Personality"],
  ["campaign", "Campaign"],
] as const;

type TabValue = (typeof TAB_VALUES)[number][0];

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
    return <StableNotFound />;
  }

  const { stableHorses } = pageData;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <StableHeader stable={stable} horseCount={stableHorses.length} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Main Content */}
        <div className="space-y-6 min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              navigate({
                search: { tab: v as TabValue },
              })
            }
            className="space-y-6"
          >
            <StableTabBar />

            <TabsContent
              value="overview"
              className="mt-0 space-y-6 animate-in fade-in duration-300"
            >
              <NpcStableOverviewTab stableId={stableId} pageData={pageData} />
            </TabsContent>

            <TabsContent value="roster" className="mt-0 space-y-6 animate-in fade-in duration-300">
              <NpcStableRosterTab pageData={pageData} />
              <RivalStakesPage stableId={stableId} />
            </TabsContent>

            <TabsContent value="trading" className="mt-0 animate-in fade-in duration-300">
              <NpcStableTradingTab stableId={stableId} />
            </TabsContent>

            <TabsContent value="staff" className="mt-0 animate-in fade-in duration-300">
              <StaffTabContent
                hiredStaff={hiredStaff}
                stableId={stableId}
                trainerStaffId={trainerStaffId}
              />
            </TabsContent>

            <TabsContent
              value="ai-profile"
              className="mt-0 space-y-6 animate-in fade-in duration-300"
            >
              <AiProfileTabContent stableId={stableId} npcAIManager={npcAIManager} />
            </TabsContent>

            <TabsContent value="campaign" className="mt-0 animate-in fade-in duration-300">
              <NpcStableCampaignTab stableId={stableId} pageData={pageData} />
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-in fade-in duration-300">
              <HistoryTabContent stable={stable} />
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

function StableNotFound() {
  return (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-4xl font-black font-[family-name=var(--font-display)] text-foreground">
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

function StableHeader({ stable, horseCount }: { stable: Stable; horseCount: number }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
      <div>
        <BackLink
          to="/stable"
          label="Stables"
          search={{ tab: "rivals" }}
          className="text-[10px] font-black text-foreground/30 hover:text-blue-400 mb-4 gap-2"
        />
        <div className="flex items-center gap-4 mb-2">
          <div
            className="w-10 h-10 rounded-sm rotate-45 border border-white/20 shadow-[0_0_15px_color-mix(in oklab, black 50%, transparent)] shrink-0"
            style={{ backgroundColor: stable.colors.primary }}
          />
          <h1 className="text-4xl font-bold tracking-tighter text-foreground font-[family-name=var(--font-display)] uppercase text-left">
            {stable.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wide text-foreground/40">
          <span>
            <Globe className="h-3 w-3 inline mr-1" />
            {stable.country}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Horses: <NumericValue value={horseCount} />
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
        <div className="text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
          Liquid Capital
        </div>
        <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
          {formatCurrency(stable.cash)}
        </div>
      </div>
    </div>
  );
}

function StableTabBar() {
  return (
    <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
      <TabsList className="bg-transparent h-10 gap-2">
        {TAB_VALUES.map(([value, label]) => (
          <TabsTrigger key={value} value={value} className={TAB_TRIGGER_CLASS}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

function StaffTabContent({
  hiredStaff,
  stableId,
  trainerStaffId,
}: {
  hiredStaff: StaffMember[] | undefined | null;
  stableId: string;
  trainerStaffId: string | undefined;
}) {
  const stableStaff = (hiredStaff ?? []).filter((m) => m.stableId === stableId);
  return (
    <>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardHeader className="bg-black/20 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-wide text-foreground/40">
            Retained Personnel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {stableStaff.length === 0 ? (
              <div className="p-12 text-center text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
                No personnel records found.
              </div>
            ) : (
              stableStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[9px] font-black uppercase tracking-wide text-foreground/40 flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> {member.role.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-bold text-foreground uppercase text-right">
                    {member.person.biography.displayName}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {trainerStaffId && (
        <div className="mt-6">
          <PersonRaceHistoryTab personId={trainerStaffId} roles={["trainer"]} />
        </div>
      )}
    </>
  );
}

function AiProfileTabContent({
  stableId,
  npcAIManager,
}: {
  stableId: string;
  npcAIManager: ReturnType<typeof useGame.getState>["npcAIManager"];
}) {
  const stableAI = npcAIManager?.stableStates?.[stableId];
  if (!stableAI) {
    return (
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardContent className="p-12 text-center text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
          No data yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <AIPersonalityCard stableAI={stableAI} />
      <StrategicDirectivesPanel directives={stableAI.strategicDirectives} />
    </>
  );
}

function HistoryTabContent({ stable }: { stable: Stable }) {
  return (
    <>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardHeader className="bg-black/20 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-wide text-foreground/40">
            Entity Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            <div className="flex justify-between p-4">
              <span className="text-[9px] font-black uppercase tracking-wide text-foreground/40">
                Established
              </span>
              <span className="font-mono text-xs text-foreground tabular-nums">
                {stable.founded}
              </span>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-[9px] font-black uppercase tracking-wide text-foreground/40">
                Reputation
              </span>
              <span className="font-mono text-xs text-fame tabular-nums">{stable.reputation}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-[9px] font-black uppercase tracking-wide text-foreground/40">
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
    </>
  );
}

export default NpcStableDetailPage;
