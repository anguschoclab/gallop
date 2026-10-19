import { notFound, useParams, useRouter } from "@tanstack/react-router";
import { type ComponentType, useEffect } from "react";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { HorseAwardsPanel } from "@/domains/awards/ui";
import { FounderLegacy } from "@/domains/horse/ui/FounderLegacy";
import { CareerArcPanel } from "@/domains/horse/ui/CareerArcPanel";
import { TrainingPanel } from "@/domains/horse/ui/TrainingPanel";
import { FoalDevelopmentPanel } from "@/domains/horse/ui/FoalDevelopmentPanel";
import { PrivateTrialDialog } from "@/domains/horse/ui/PrivateTrialDialog";
import { SyndicateDialog } from "@/domains/market/ui/SyndicateDialog";
import { ShareOwnershipPanel } from "@/domains/market/ui/ShareOwnershipPanel";
import { HorseDetailHeader } from "@/domains/horse/ui/HorseDetailHeader";
import { HorseIdentitySection } from "@/domains/horse/ui/HorseIdentitySection";
import { HorseConditionSection } from "@/domains/horse/ui/HorseConditionSection";
import { HorseAnalyticsSection } from "@/domains/horse/ui/HorseAnalyticsSection";
import { RunningStyleBreakdown } from "@/domains/horse/ui/RunningStyleBreakdown";
import { HorseDailyProgress } from "@/domains/horse/ui/HorseDailyProgress";
import { HorseManagementSection } from "@/domains/horse/ui/HorseManagementSection";
import { HorseLineageSection } from "@/domains/horse/ui/HorseLineageSection";
import { BreedingTimeline } from "@/domains/breeding/ui/BreedingTimeline";
import { HorseRaceHistorySection } from "@/domains/horse/ui/HorseRaceHistorySection";
import { HorseGeneticsSection } from "@/domains/horse/ui/HorseGeneticsSection";
import { CareerProjectionSection } from "@/domains/horse/ui/CareerProjectionSection";
import { FoalInheritancePanel } from "@/domains/horse/ui/FoalInheritancePanel";
import { InsurancePanel } from "@/domains/insurance/ui/InsurancePanel";
import { StewardsPanel } from "@/domains/stewards/ui/StewardsPanel";
import { TransportPlanner } from "@/domains/transportation/ui/TransportPlanner";
import { BackLink } from "@/shared/ui/charts/BackLink";
import { calculateOverallRating } from "@/domains/horse/application/horseFacade";
import { useHorseActions } from "@/domains/horse/application/hooks/useHorseActions";
import { useHorseDetail } from "@/domains/horse/application/hooks/useHorseDetail";
import { useHorses } from "@/platform/game/hooks/useCoreState";
import { useGame } from "@/platform/game/store";
import { Zap, FileText, Activity, TrendingUp, GitBranch, History, Dna } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface HorseDetailProps {
  horseId?: string;
}

export function HorseDetail({ horseId: propHorseId }: HorseDetailProps = {}) {
  let paramHorseId: string | undefined;
  try {
    const params = useParams({ from: "/stable/$horseId" });
    paramHorseId = params?.horseId;
  } catch {
    // Outside TanStack router context (e.g. testing or embedded usage)
  }
  const horseId = propHorseId ?? paramHorseId ?? "";
  const router = useRouter();
  const { horse, isConsigned, canRetireToStud, consignedSale, eligibleSale, day } =
    useHorseActions(horseId);

  const detail = useHorseDetail(horseId);
  const horses = useHorses();
  const completeTutorialBeat = useGame((s) => s.completeTutorialBeat);

  // Tutorial beat 0: player visited a horse's page
  useEffect(() => {
    completeTutorialBeat(0);
  }, [completeTutorialBeat]);

  if (!horse) throw notFound();

  const ovr = calculateOverallRating(horse);
  const { peakingMultiplier, peakingStatus, g1Wins } = detail;
  const isG1Winner = g1Wins > 0;

  const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    stats: FileText,
    health: Activity,
    training: Zap,
    beyer: TrendingUp,
    lineage: GitBranch,
    projection: TrendingUp,
    history: History,
    genetics: Dna,
  };

  return (
    <div className="flex gap-8 relative pb-20 animate-fade-in">
      {/* Sticky Navigation Sidebar */}
      <aside className="hidden xl:block w-48 shrink-0">
        <div className="sticky top-6 space-y-6">
          <BackLink
            to="/stable"
            label="Back to Stable"
            className="text-[10px] font-black text-foreground/30 hover:text-primary mb-8 gap-2"
          />

          <nav className="space-y-1">
            {detail.sections.map((s) => {
              const Icon = iconMap[s.id];
              return (
                <button
                  key={s.id}
                  data-section-id={s.id}
                  onClick={detail.handleScrollToSection}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium border-l-2 transition-all",
                    detail.activeSection === s.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="text-[9px] font-black uppercase tracking-tighter text-primary/40 px-3">
              Actions
            </div>
            <div className="px-3 space-y-2">
              {isG1Winner && horse.stud?.atStud && !detail.isSyndicated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-primary/20 hover:bg-primary/10 text-primary"
                  onClick={() => detail.setSyndicateDialogOpen(true)}
                >
                  Syndicate
                </Button>
              )}
              {canRetireToStud && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[9px] font-black uppercase border-primary/20 hover:bg-primary/10 text-accent-bright"
                    >
                      Retire to Stud
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retire {horse.name} to stud?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will retire the horse from active racing permanently. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: "destructive" })}
                        onClick={() => detail.retireToStud(horse.id)}
                      >
                        Retire to Stud
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Record Area */}
      <div className="flex-1 space-y-12">
        <HorseDetailHeader horse={horse} ovr={ovr} />

        {/* Pillar Layout: Physical vs Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PILLAR */}
          <div className="lg:col-span-5 space-y-8">
            <HorseIdentitySection horse={horse} peakingStatus={peakingStatus} />
            {horse.developmentArc && <FoalDevelopmentPanel horse={horse} />}
            <HorseConditionSection horse={horse} />
            <HorseManagementSection
              horse={horse}
              isConsigned={isConsigned}
              consignedSale={consignedSale}
              eligibleSale={eligibleSale}
              day={day}
            />
            <InsurancePanel horseId={horse.id} />
            <StewardsPanel horseId={horse.id} />
            <TransportPlanner horseId={horse.id} />
          </div>

          {/* RIGHT PILLAR */}
          <div className="lg:col-span-7 space-y-8">
            <section id="training" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
                  Training
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-primary">
                <CardHeader className="pb-2 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-black uppercase tracking-wide text-foreground/40">
                      Training Schedule
                    </CardTitle>
                    <span className="text-[10px] font-mono text-accent-bright font-black uppercase">
                      {detail.slotsLeft} slots left
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TrainingPanel
                    horse={horse}
                    isPregnant={detail.isPregnant}
                    slotsLeft={detail.slotsLeft}
                    cash={detail.cash}
                    facilities={detail.facilities}
                    onTrain={detail.handleTrain}
                  />
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <PrivateTrialDialog
                      horse={horse}
                      horses={Object.values(horses)}
                      cash={detail.cash}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            <HorseAnalyticsSection horse={horse} peakingMultiplier={peakingMultiplier} />

            <HorseDailyProgress horseId={horse.id} />

            <RunningStyleBreakdown horse={horse} />

            <HorseGeneticsSection horse={horse} />

            <HorseLineageSection
              horse={horse}
              horseId={horseId}
              progenyPregnancies={detail.progenyPregnancies}
              reBreedingPregnancies={detail.reBreedingPregnancies}
              localHorseMap={detail.localHorseMap}
            />

            <BreedingTimeline horseId={horseId} />

            {(horse.sireId || horse.damId) && (
              <FoalInheritancePanel
                foal={horse}
                sire={horse.sireId ? detail.localHorseMap?.get(horse.sireId) : undefined}
                dam={horse.damId ? detail.localHorseMap?.get(horse.damId) : undefined}
              />
            )}

            <CareerProjectionSection horse={horse} horses={horses} />

            <HorseRaceHistorySection
              horse={horse}
              raceHistoryLimit={detail.raceHistoryLimit}
              onLimitChange={detail.setRaceHistoryLimit}
            />

            <FounderLegacy horseId={horse.id} />
            <CareerArcPanel horseId={horse.id} />
            <HorseAwardsPanel horse={horse} />
            {detail.isSyndicated && detail.syndicates[horse.id] && (
              <ShareOwnershipPanel syndicate={detail.syndicates[horse.id]} stallion={horse} />
            )}
          </div>
        </div>
      </div>

      <SyndicateDialog
        isOpen={detail.syndicateDialogOpen}
        onClose={() => detail.setSyndicateDialogOpen(false)}
        stallionId={horse.id}
        stallionName={horse.name}
      />
    </div>
  );
}

export default HorseDetail;
