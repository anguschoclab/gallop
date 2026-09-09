import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

import { StrategyHeader } from "@/components/strategy/StrategyHeader";
import { TargetGradesSection } from "@/components/strategy/TargetGradesSection";
import { TrackPrestigeSection } from "@/components/strategy/TrackPrestigeSection";
import { SyndicationStakesSection } from "@/components/strategy/SyndicationStakesSection";
import { LiveAnnualTimeline } from "@/components/strategy/LiveAnnualTimeline";
import { CampaignAlertsFeed } from "@/components/strategy/CampaignAlertsFeed";
import type { Horse, HorseCampaign, Race } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h-test-1",
    name: "Apex Comet",
    age: 4,
    gender: "colt",
    energy: 85,
    healthStatus: "healthy",
    form: 4,
    fame: 65,
    stats: {
      speed: 80,
      stamina: 75,
      acceleration: 78,
      temperament: 70,
      conformation: 72,
      consistency: 75,
    },
    raceHistory: [{ raceId: "r1", raceName: "Derby Prep", grade: "G2", position: 1, day: 80 }],
    ...overrides,
  }) as Horse;

const mkCampaign = (overrides: Partial<HorseCampaign> = {}): HorseCampaign => ({
  horseId: "h-test-1",
  goalType: "chase_g1",
  autoManaged: true,
  flags: [
    {
      day: 90,
      type: "field_full",
      message: "Bumped from Saratoga Cup — field full.",
      dismissed: false,
    },
  ],
  slots: [
    {
      dayTarget: 120,
      dayWindow: 5,
      raceId: "r-target",
      role: "target",
      constraintGradeMin: "G1",
      status: "planned",
    },
  ],
  confirmedAptitudes: {
    surfaceStarts: { Turf: 0, Dirt: 3, Synthetic: 0 },
    distanceBandStarts: { sprint: 0, mile: 3, intermediate: 0, staying: 0 },
    surfaceConfirmed: "Dirt",
    distanceBandConfirmed: "mile",
  },
  createdDay: 1,
  lastReviewedDay: 90,
  ...overrides,
});

const sampleRaces: Race[] = [
  {
    id: "r-target",
    name: "Whitney Stakes",
    track: "Saratoga",
    trackId: "saratoga",
    distance: 1800,
    surface: "Dirt",
    day: 120,
    fieldSize: 12,
    entries: [],
    entryFee: 1000,
    purse: 1000000,
    graded: {
      key: "whitney",
      name: "Whitney Stakes",
      grade: "G1",
      track: "Saratoga",
      distance: 1800,
      surface: "Dirt",
      purse: 1000000,
      dayOfYear: 120,
    } as any,
    resolved: false,
    cancelled: false,
  } as unknown as Race,
];

describe("Strategy Page UI Components", () => {
  it("renders StrategyHeader with horse identity and auto-manage toggle", () => {
    const horse = mkHorse();
    const campaign = mkCampaign();
    const onToggleAuto = vi.fn();

    render(<StrategyHeader horse={horse} campaign={campaign} onToggleAutoManaged={onToggleAuto} />);

    expect(screen.getByText("Apex Comet")).toBeDefined();
    expect(screen.getByText(/Auto-Managed/i)).toBeDefined();
  });

  it("renders TargetGradesSection and shows target grade options", () => {
    const horse = mkHorse();
    const campaign = mkCampaign();
    const onSetGoal = vi.fn();
    const onGeneratePrep = vi.fn();

    render(
      <TargetGradesSection
        horse={horse}
        campaign={campaign}
        onSetGoal={onSetGoal}
        onGeneratePrepChain={onGeneratePrep}
      />,
    );

    expect(screen.getByText(/Target Grade & Goal/i)).toBeDefined();
    expect(screen.getByText(/Auto-Generate Prep Chain/i)).toBeDefined();
  });

  it("renders TrackPrestigeSection with venue prestige details", () => {
    const campaign = mkCampaign();
    const raceMap = new Map([["r-target", sampleRaces[0]]]);

    render(<TrackPrestigeSection slots={campaign.slots} getRace={(id) => raceMap.get(id)} />);

    expect(screen.getByText(/Track Prestige Intelligence/i)).toBeDefined();
    expect(screen.getByText(/Average Campaign Prestige/i)).toBeDefined();
  });

  it("renders SyndicationStakesSection with 40-share commercial model", () => {
    const horse = mkHorse();
    const horses = { [horse.id]: horse };
    const onOpenSyndicateDialog = vi.fn();

    render(
      <SyndicationStakesSection
        horse={horse}
        horses={horses}
        onOpenSyndicateDialog={onOpenSyndicateDialog}
      />,
    );

    expect(screen.getByText(/Syndication Stakes & Commercial Horizon/i)).toBeDefined();
    expect(screen.getByText(/40-Share Syndication Model/i)).toBeDefined();
  });

  it("renders LiveAnnualTimeline with current day and slot cards", () => {
    const campaign = mkCampaign();
    const raceMap = new Map([["r-target", sampleRaces[0]]]);
    const onAddSlot = vi.fn();
    const onRemoveSlot = vi.fn();

    render(
      <LiveAnnualTimeline
        currentDay={95}
        slots={campaign.slots}
        getRace={(id) => raceMap.get(id)}
        onAddSlot={onAddSlot}
        onRemoveSlot={onRemoveSlot}
      />,
    );

    expect(screen.getByText(/Live Annual Campaign Timeline/i)).toBeDefined();
    expect(screen.getByText(/Whitney Stakes/i)).toBeDefined();
  });

  it("renders CampaignAlertsFeed with field full bump flag and dismissal", () => {
    const campaign = mkCampaign();
    const onDismiss = vi.fn();

    render(<CampaignAlertsFeed flags={campaign.flags} onDismissFlag={onDismiss} />);

    expect(screen.getByText(/Campaign Alerts & Feed/i)).toBeDefined();
    expect(screen.getByText(/Bumped from Saratoga Cup/i)).toBeDefined();
  });
});
