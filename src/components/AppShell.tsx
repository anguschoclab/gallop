import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useGame, type StoreType } from "@/game/store";
import { useDay, useCash, useHorses } from "@/hooks/game/useCoreState";
import { useAwards } from "@/hooks/game/useSystemsState";
import { useAutoSave } from "@/hooks/game/useAutoSave";
import { PlayerRacePrompt } from "@/components/race/PlayerRacePrompt";
import { AutoSimPanel } from "@/components/race/AutoSimPanel";
import { StewardsDigestToast } from "@/components/stewards/StewardsDigestToast";
import { AwardCeremony } from "./awards";
import { SidebarNav } from "./SidebarNav";
import { useEffect, useMemo, useState } from "react";
import { useSkipToNext } from "@/hooks/shared/useSkipToNext";
import { useAutoResumeAdvance } from "@/hooks/game/useAutoResumeAdvance";
import { useAwardCeremony } from "@/hooks/awards/useAwardCeremony";
import { useUnreadCount } from "@/hooks/inbox/useInbox";
import { DAYS_PER_WEEK, DAYS_PER_MONTH } from "@/constants";

export function AppShell() {
  useAutoSave();
  const day = useDay();
  const cash = useCash();
  const horses = useHorses();
  const playerProfile = useGame((s: StoreType) => s.playerProfile);
  const advanceDay = useGame((s: StoreType) => s.advanceDay);
  const advanceMultipleDays = useGame((s: StoreType) => s.advanceMultipleDays);
  const skipToNext = useSkipToNext();
  const isAdvancing = useGame(
    (s: StoreType) => s.execution?.status === "running" || s.execution?.status === "cancelling",
  );
  const cancelAdvance = useGame((s: StoreType) => s.cancelAdvance);

  // Auto-resume batch advancement after player race is resolved
  useAutoResumeAdvance();

  // Clear batch progress when advancing finishes
  useEffect(() => {
    if (!isAdvancing) setBatchProgress(null);
  }, [isAdvancing]);

  const location = useLocation();
  const navigate = useNavigate();
  const [autoSimOpen, setAutoSimOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ day: number; total: number } | null>(null);

  const unreadCount = useUnreadCount();
  const inbox = useGame((s: StoreType) => s.inbox);
  const unreadMessages = useMemo(
    () =>
      inbox
        .filter((m) => !m.readAt)
        .sort((a, b) => {
          const aPinned = a.pinnedUntil && a.pinnedUntil >= day;
          const bPinned = b.pinnedUntil && b.pinnedUntil >= day;
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return b.day - a.day;
        })
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          day: m.day,
          title: m.title,
          category: m.category,
          priority: m.priority,
          pinned: (m.pinnedUntil ?? 0) >= day,
        })),
    [inbox, day],
  );

  const awards = useAwards();
  const { showCeremony, setShowCeremony, pendingCeremonies, clearPendingCeremonies } =
    useAwardCeremony();

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
          horseCount={Object.keys(horses).length}
          unreadCount={unreadCount}
          unreadMessages={unreadMessages}
          isAdvancing={isAdvancing}
          onAdvanceDay={() => advanceDay()}
          onAdvanceWeek={() =>
            setTimeout(
              () =>
                advanceMultipleDays(DAYS_PER_WEEK, false, (day, total) =>
                  setBatchProgress({ day, total }),
                ),
              0,
            )
          }
          onAdvanceMonth={() =>
            setTimeout(
              () =>
                advanceMultipleDays(DAYS_PER_MONTH, false, (day, total) =>
                  setBatchProgress({ day, total }),
                ),
              0,
            )
          }
          onOpenAutoSim={() => setAutoSimOpen(true)}
          onSkipToAuction={() => skipToNext("auction")}
          onSkipToRace={() => skipToNext("race")}
          onStartNewGame={() => {
            navigate({ to: "/new-game" });
          }}
        />
      )}
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <PlayerRacePrompt />
      <AutoSimPanel open={autoSimOpen} onClose={() => setAutoSimOpen(false)} />
      <StewardsDigestToast />
      {isAdvancing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-t950/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-cream-muted font-[family-name=var(--font-body)]">Advancing days…</p>
            {batchProgress && (
              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-t700 mx-auto">
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-300"
                    style={{
                      width: `${Math.round((batchProgress.day / batchProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-cream-muted">
                  Day {batchProgress.day} of {batchProgress.total}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => cancelAdvance?.()}
              className="mt-4 rounded-md border border-t600 px-3 py-1.5 text-xs text-cream-muted hover:bg-t800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <AwardCeremony
        isOpen={showCeremony}
        onClose={() => setShowCeremony(false)}
        ceremonies={pendingCeremonies || []}
        onComplete={() => clearPendingCeremonies?.()}
      />
    </div>
  );
}
