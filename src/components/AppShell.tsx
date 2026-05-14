import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Home,
  Trophy,
  Store,
  Calendar,
  Plus,
  Heart,
  Gavel,
  Settings,
  User,
  Baby,
  DollarSign,
  Building2,
  Award,
  Users,
  Map,
  Clock,
  LayoutGrid,
  Star,
  Bell,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { useDay, useCash, useHorses } from "@/game/hooks/useCoreState";
import { useAwards } from "@/game/hooks/useSystemsState";
import { useAutoSave } from "@/game/hooks/useAutoSave";
import { PlayerRacePrompt } from "./PlayerRacePrompt";
import { AutoSimPanel } from "./AutoSimPanel";
import { AwardCeremony } from "./awards";
import { useState, useEffect } from "react";
import { DAYS_PER_WEEK, DAYS_PER_MONTH } from "@/game/constants/gameConstants";
import { shallow } from "zustand/shallow";

const navSections = [
  {
    label: "Headquarters",
    items: [
      { to: "/", label: "Dashboard", icon: Home, exact: true },
      { to: "/inbox", label: "Inbox", icon: Bell, exact: false },
      { to: "/financial-report", label: "Finances", icon: DollarSign, exact: false },
      { to: "/facilities", label: "Facilities", icon: Building2, exact: false },
    ],
  },
  {
    label: "My Stable",
    items: [
      { to: "/stable", label: "Stables", icon: Trophy, exact: false },
      { to: "/horse-gallery", label: "Horse Gallery", icon: LayoutGrid, exact: false },
      { to: "/staff", label: "Staff", icon: Users, exact: false },
      { to: "/jockeys", label: "Jockeys", icon: User, exact: false },
      { to: "/scheduler", label: "Scheduler", icon: Clock, exact: false },
      {
        to: "/breeding",
        label: "Breeding",
        icon: Heart,
        exact: false,
        subItems: [
          { to: "/breeding", label: "Mating", icon: Heart, exact: true },
          { to: "/broodmares", label: "Broodmares", icon: Baby, exact: false },
        ],
      },
      { to: "/records", label: "Hall of Records", icon: Award, exact: false },
    ],
  },
  {
    label: "The World",
    items: [
      {
        to: "/races",
        label: "Racing Calendar",
        icon: Calendar,
        exact: false,
        subItems: [{ to: "/calendar", label: "Calendar", icon: Calendar, exact: false }],
      },
      { to: "/market", label: "Horse Market", icon: Store, exact: false },
      { to: "/auction", label: "Auctions", icon: Gavel, exact: false },
      { to: "/npc-stables", label: "NPC Stables", icon: Map, exact: false },
      { to: "/stallions", label: "Stallions", icon: Star, exact: false },
      { to: "/sire-watch", label: "Sire Watch", icon: Star, exact: false },
      { to: "/sire-leaderboards", label: "Sire Leaderboards", icon: Trophy, exact: false },
    ],
  },
  {
    label: "Configuration",
    items: [{ to: "/settings", label: "Settings", icon: Settings, exact: false }],
  },
] as const;

export function AppShell() {
  useAutoSave();
  const navigate = useNavigate();
  const day = useDay();
  const cash = useCash();
  const horses = useHorses();
  const playerProfile = useGame((s: StoreType) => s.playerProfile);
  const advanceDay = useGame((s: StoreType) => s.advanceDay);
  const advanceMultipleDays = useGame((s: StoreType) => s.advanceMultipleDays);
  const startNewGame = useGame((s: StoreType) => s.startNewGame);
  const location = useLocation();
  const [autoSimOpen, setAutoSimOpen] = useState(false);
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);

  const inbox = useGame((s: StoreType) => s.inbox);
  const unreadCount = inbox?.filter((m) => !m.readAt).length ?? 0;

  const awards = useAwards();
  const pendingCeremonies = useGameWithShallow((s: StoreType) => s.pendingAwardCeremonies);
  const [showCeremony, setShowCeremony] = useState(false);
  const clearPendingCeremonies = useGame((s: StoreType) => s.clearPendingCeremonies);

  useEffect(() => {
    if (pendingCeremonies && pendingCeremonies.length > 0) {
      setShowCeremony(true);
    }
  }, [pendingCeremonies]);

  const isRace = location.pathname.startsWith("/race/");
  if (isRace) return <Outlet />;

  const showSidebar = !!playerProfile;

  return (
    <div className="flex min-h-screen bg-t900 animate-fade-in">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </a>
      {showSidebar && (
      <aside className="w-[248px] shrink-0 border-r border-gold-muted bg-t950 flex flex-col">
        <div className="p-5 border-b border-gold-muted">
          {/* Design Bible: Brand title uses display font */}
          <h1 className="text-[21px] font-bold text-gold font-[family-name:var(--font-display)] tracking-[0.04em] leading-none">
            Gallop
          </h1>
          <p className="text-[9px] tracking-[0.14em] uppercase text-cream-muted font-[family-name:var(--font-mono)] tabular-nums mt-1 block">
            {gameCalendarDate(day)}
          </p>
        </div>
        <div className="p-3 border-t border-gold-muted space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cream-muted font-[family-name:var(--font-mono)] mb-2">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 text-sm text-cream-muted hover:text-gold transition-colors group"
                    activeProps={{
                      className: "text-gold font-medium",
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Inbox" && unreadCount > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white group-hover:bg-red-500">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gold-muted space-y-2">
          <div className="px-3 py-2 rounded-md bg-t800 border border-gold-muted">
            <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">Cash</p>
            {/* Design Bible: Numbers use IBM Plex Mono with tabular-nums */}
            <p className="text-[22px] font-bold text-cream font-[family-name:var(--font-mono)] tabular-nums">
              ${cash.toLocaleString()}
            </p>
            <p className="text-[10px] text-cream-muted/60 mt-1">
              {horses.length} horses
            </p>
            <div className="grid grid-cols-4 gap-1">
              <Button
                onClick={() => advanceDay()}
                className="col-span-1"
                size="sm"
                variant="outline"
                aria-label="Advance 1 day"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => {
                  // Use setTimeout to ensure the click completes before starting the async operation
                  setTimeout(() => advanceMultipleDays(DAYS_PER_WEEK), 0);
                }}
                className="col-span-1"
                size="sm"
                variant="outline"
                title="Advance 1 week"
              >
                7d
              </Button>
              <Button
                onClick={() => {
                  // Use setTimeout to ensure the click completes before starting the async operation
                  setTimeout(() => advanceMultipleDays(DAYS_PER_MONTH), 0);
                }}
                className="col-span-1"
                size="sm"
                variant="outline"
                title="Advance 1 month"
              >
                30d
              </Button>
              <Button
                onClick={() => setAutoSimOpen(true)}
                className="col-span-1"
                size="sm"
                variant="outline"
                aria-label="AutoSim settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setNewGameDialogOpen(true)}
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground"
            size="sm"
            variant="ghost"
          >
            Start new game
          </Button>
          <Dialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Game</DialogTitle>
                <DialogDescription>
                  This will delete your current game progress and start a new one. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setNewGameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    window.location.href = "/new-game";
                  }}
                >
                  Start new game
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>
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
