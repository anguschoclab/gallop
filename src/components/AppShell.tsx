import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
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

const navSections = [
  {
    label: "Headquarters",
    items: [
      { to: "/", label: "Dashboard", icon: Home, exact: true },
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
  const playerProfile = useGame((s) => s.playerProfile);
  const advanceDay = useGame((s) => s.advanceDay);
  const advanceMultipleDays = useGame((s) => s.advanceMultipleDays);
  const startNewGame = useGame((s) => s.startNewGame);
  const location = useLocation();
  const [autoSimOpen, setAutoSimOpen] = useState(false);
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);

  const awards = useAwards();
  const pendingCeremonies = useGame((s) => s.pendingAwardCeremonies);
  const [showCeremony, setShowCeremony] = useState(false);
  const clearPendingCeremonies = useGame((s) => s.clearPendingCeremonies);

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
        <nav className="flex-1 p-3 space-y-1">
          {navSections.map((section) => (
            <div key={section.label}>
              <span className="text-[9px] tracking-[0.14em] uppercase text-cream-muted px-3 pb-2 block">
                {section.label}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <div key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        active
                          ? "border-l-2 border-gold text-gold bg-gold-subtle"
                          : "text-cream-muted/70 hover:bg-gold-subtle hover:text-cream",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                    {"subItems" in item && item.subItems && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive = subItem.exact
                            ? location.pathname === subItem.to
                            : location.pathname.startsWith(subItem.to);
                          return (
                            <Link
                              key={subItem.to}
                              to={subItem.to}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                subActive
                                  ? "border-l-2 border-gold text-gold bg-gold-subtle"
                                  : "text-cream-muted/60 hover:bg-gold-subtle hover:text-cream",
                              )}
                            >
                              <SubIcon className="h-3 w-3" />
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-gold-muted space-y-2">
          <div className="px-3 py-2 rounded-md bg-t800 border border-gold-muted">
            <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">Cash</p>
            {/* Design Bible: Numbers use IBM Plex Mono with tabular-nums */}
            <p className="text-[22px] font-bold text-cream font-[family-name:var(--font-mono)] tabular-nums">
              {formatCurrency(cash)}
            </p>
          </div>
          <div className="px-3 py-1 text-xs text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">
            {horses.length} horses
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Button
              onClick={() => advanceDay()}
              className="col-span-1"
              size="sm"
              title="Advance 1 day"
              aria-label="Advance 1 day"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => {
                // Use setTimeout to ensure the click completes before starting the async operation
                setTimeout(() => advanceMultipleDays(DAYS_PER_WEEK), 0);
              }}
              className="col-span-1 tabular-nums"
              size="sm"
              variant="secondary"
              title="Advance 1 week"
            >
              7d
            </Button>
            <Button
              onClick={() => {
                // Use setTimeout to ensure the click completes before starting the async operation
                setTimeout(() => advanceMultipleDays(DAYS_PER_MONTH), 0);
              }}
              className="col-span-1 tabular-nums"
              size="sm"
              variant="secondary"
              title="Advance 1 month"
            >
              30d
            </Button>
            <Button
              onClick={() => setAutoSimOpen(true)}
              className="col-span-1"
              size="sm"
              variant="ghost"
              title="AutoSim settings"
              aria-label="AutoSim settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
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
                <DialogTitle>Start a new game?</DialogTitle>
                <DialogDescription>
                  All current progress will be lost. This cannot be undone.
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
                    setNewGameDialogOpen(false);
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
