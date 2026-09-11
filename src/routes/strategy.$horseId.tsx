import { useState, useMemo } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";
import { StrategyHeader } from "@/components/strategy/StrategyHeader";
import { TargetGradesSection } from "@/components/strategy/TargetGradesSection";
import { TrackPrestigeSection } from "@/components/strategy/TrackPrestigeSection";
import { LiveAnnualTimeline } from "@/components/strategy/LiveAnnualTimeline";
import { SyndicationStakesSection } from "@/components/strategy/SyndicationStakesSection";
import { CampaignAlertsFeed } from "@/components/strategy/CampaignAlertsFeed";
import { SyndicateDialog } from "@/components/market/SyndicateDialog";
import { toast } from "sonner";
import type { CampaignGoalType, CampaignRaceSlot } from "@/services/calendar/calendarFacade";
import type { Race } from "@/game/types";

export const Route = createFileRoute("/strategy/$horseId")({
  component: StrategyPage,
});

function StrategyPage() {
  const { horseId } = Route.useParams();
  const router = useRouter();

  const horse = useGame((s) => s.horses[horseId]);
  const horses = useGame((s) => s.horses);
  const currentDay = useGame((s) => s.day);
  const campaign = useGame((s) => s.campaigns?.find((c) => c.horseId === horseId));
  const races = useGame((s) => s.races);

  const generateAutoCampaign = useGame((s) => s.generateAutoCampaign);
  const toggleAutoManaged = useGame((s) => s.toggleAutoManaged);
  const setCampaignTargetRace = useGame((s) => s.setCampaignTargetRace);
  const addCampaignSlot = useGame((s) => s.addCampaignSlot);
  const removeCampaignSlot = useGame((s) => s.removeCampaignSlot);
  const dismissCampaignFlag = useGame((s) => s.dismissCampaignFlag);

  const [isSyndicateOpen, setIsSyndicateOpen] = useState(false);

  const raceMap = useMemo(() => {
    const map = new Map<string, Race>();
    if (!races) return map;
    for (const r of Object.values(races)) {
      if (r?.id) map.set(r.id, r);
    }
    return map;
  }, [races]);

  const getRace = (raceId: string) => raceMap.get(raceId);

  // Guard: Horse not found
  if (!horse) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-3xl font-black text-cream">Horse Not Found</h1>
        <p className="text-muted-foreground text-sm">No horse found with ID: {horseId}</p>
        <Link
          to="/stable"
          className="inline-flex items-center gap-1.5 text-xs uppercase font-mono tracking-wider text-amber-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Stable
        </Link>
      </div>
    );
  }

  const handleCreateInitialCampaign = (goal: CampaignGoalType = "chase_g1") => {
    generateAutoCampaign(horse.id, goal);
    toast.success(`Initialized ${goal.replace("_", " ")} strategy for ${horse.name}!`);
  };

  const handleToggleAuto = () => {
    if (!campaign) return;
    const nextVal = !campaign.autoManaged;
    toggleAutoManaged(horse.id, nextVal);
    toast.success(
      nextVal
        ? "Auto-Managed enabled: AI will optimize entries and prep chains."
        : "Manual control enabled: All race entries are now managed manually.",
    );
  };

  const handleSetGoal = (goal: CampaignGoalType, targetKey?: string) => {
    if (targetKey) {
      setCampaignTargetRace(horse.id, targetKey);
    }
    generateAutoCampaign(horse.id, goal, targetKey);
    toast.success(`Updated campaign goal to ${goal.replace("_", " ")}`);
  };

  const handleGeneratePrepChain = (goal: CampaignGoalType, targetKey?: string) => {
    generateAutoCampaign(horse.id, goal, targetKey);
    toast.success(`Regenerated campaign prep chain for ${horse.name}`);
  };

  const handleAddSlot = (slot: CampaignRaceSlot) => {
    addCampaignSlot(horse.id, slot);
    toast.success("Campaign slot added.");
  };

  const handleRemoveSlot = (slotIndex: number) => {
    removeCampaignSlot(horse.id, slotIndex);
    toast.info("Campaign slot removed.");
  };

  const handleDismissFlag = (flagIndex: number) => {
    dismissCampaignFlag(horse.id, flagIndex);
    toast.info("Alert dismissed.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.history.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span>Day {currentDay}</span>
          <span>•</span>
          <Link
            to="/stable/$horseId"
            params={{ horseId: horse.id }}
            className="hover:text-primary transition-colors underline"
          >
            Horse Profile
          </Link>
        </div>
      </div>

      {/* Horse Strategy Header */}
      <StrategyHeader horse={horse} campaign={campaign} onToggleAutoManaged={handleToggleAuto} />

      {/* Uninitialized Campaign Empty State */}
      {!campaign ? (
        <Card className="border-dashed border-border/80 bg-card/40 backdrop-blur-sm p-8 text-center space-y-4">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Compass className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">
              No Campaign Strategy Active for {horse.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Construct a targeted racing campaign with prep chains, track prestige targets, and
              40-share commercial syndication horizons.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button
              onClick={() => handleCreateInitialCampaign("chase_g1")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Generate Grade 1 Campaign
            </Button>
            <Button variant="outline" onClick={() => handleCreateInitialCampaign("free_run")}>
              Start Custom Manual Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Campaign Alerts Feed (Injury, Bumped from Race, Energy) */}
          <CampaignAlertsFeed
            flags={campaign.flags}
            onDismissFlag={handleDismissFlag}
            onNavigateToCalendar={() => router.navigate({ to: "/calendar" })}
          />

          {/* Target Grades & Objectives */}
          <TargetGradesSection
            horse={horse}
            campaign={campaign}
            onSetGoal={handleSetGoal}
            onGeneratePrepChain={handleGeneratePrepChain}
          />

          {/* Track Prestige Intelligence */}
          <TrackPrestigeSection slots={campaign.slots} getRace={getRace} />

          {/* Live Annual Timeline */}
          <LiveAnnualTimeline
            currentDay={currentDay}
            slots={campaign.slots}
            getRace={getRace}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
          />

          {/* Syndication Stakes & Commercial Horizon */}
          <SyndicationStakesSection
            horse={horse}
            horses={horses}
            onOpenSyndicateDialog={() => setIsSyndicateOpen(true)}
          />
        </div>
      )}

      {/* Syndicate Stallion Dialog */}
      <SyndicateDialog
        isOpen={isSyndicateOpen}
        onClose={() => setIsSyndicateOpen(false)}
        stallionId={horse.id}
        stallionName={horse.name}
      />
    </div>
  );
}
