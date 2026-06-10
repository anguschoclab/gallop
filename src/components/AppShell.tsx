import { Outlet, useLocation } from "@tanstack/react-router";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import { useDay, useCash, useHorses } from "@/hooks/game/useCoreState";
import { useAwards } from "@/hooks/game/useSystemsState";
import { useAutoSave } from "@/hooks/game/useAutoSave";
import { PlayerRacePrompt } from "@/components/race/PlayerRacePrompt";
import { AutoSimPanel } from "@/components/race/AutoSimPanel";
import { AwardCeremony } from "./awards";
import { SidebarNav } from "./SidebarNav";
import { useState } from "react";
import { useSkipToNext } from "@/hooks/useSkipToNext";
import { useAwardCeremony } from "@/hooks/useAwardCeremony";
import { DAYS_PER_WEEK, DAYS_PER_MONTH } from "@/constants/game";

export function AppShell() {
  useAutoSave();
  const day = useDay();
  const cash = useCash();
  const horses = useHorses();
  const playerProfile = useGame((s: StoreType) => s.playerProfile);
  const advanceDay = useGame((s: StoreType) => s.advanceDay);
  const advanceMultipleDays = useGame((s: StoreType) => s.advanceMultipleDays);
  const skipToNext = useSkipToNext();

  const location = useLocation();
  const [autoSimOpen, setAutoSimOpen] = useState(false);

  const inbox = useGame((s: StoreType) => s.inbox);
  const unreadCount = inbox?.filter((m) => !m.readAt).length ?? 0;

  const awards = useAwards();
  const {
    showCeremony,
    setShowCeremony,
    pendingCeremonies,
    clearPendingCeremonies,
  } = useAwardCeremony();

  const isRace = location.pathname.startsWith("/race/");
  const isStart = location.pathname === "/start";
  if (isRace || isStart) return <Outlet />;

  const showSidebar = !!playerProfile;

  return (
    <div className="flex min-h-screen bg-t900 animate-fade-in">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </a>
      {showSidebar && (
        <SidebarNav
          day={day}
          cash={cash}
          horseCount={horses.length}
          unreadCount={unreadCount}
          onAdvanceDay={() => advanceDay()}
          onAdvanceWeek={() => setTimeout(() => advanceMultipleDays(DAYS_PER_WEEK), 0)}
          onAdvanceMonth={() => setTimeout(() => advanceMultipleDays(DAYS_PER_MONTH), 0)}
          onOpenAutoSim={() => setAutoSimOpen(true)}
          onSkipToAuction={() => skipToNext("auction")}
          onSkipToRace={() => skipToNext("race")}
          onStartNewGame={() => { window.location.href = "/new-game"; }}
        />
      )}
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <PlayerRacePrompt />
      <AutoSimPanel open={autoSimOpen} onClose={() => setAutoSimOpen(false)} />
      <AwardCeremony
        isOpen={showCeremony}
        onClose={() => setShowCeremony(false)}
        ceremonies={pendingCeremonies || []}
        onComplete={() => clearPendingCeremonies?.()}
      />
    </div>
  );
}
