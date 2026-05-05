import { Link, Outlet, useLocation } from "@tanstack/react-router";
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
import { Home, Trophy, Store, Calendar, Plus, Heart, Gavel, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { PlayerRacePrompt } from "./PlayerRacePrompt";
import { AutoSimPanel } from "./AutoSimPanel";
import { AwardCeremony } from "./awards";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, exact: true },
  { to: "/stable", label: "Stable", icon: Trophy, exact: false },
  { to: "/races", label: "Races", icon: Calendar, exact: false },
  { to: "/breeding", label: "Breeding", icon: Heart, exact: false },
  { to: "/auction", label: "Auction", icon: Gavel, exact: false },
  { to: "/market", label: "Market", icon: Store, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AppShell() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);
  const advanceDay = useGame((s) => s.advanceDay);
  const advanceMultipleDays = useGame((s) => s.advanceMultipleDays);
  const newGame = useGame((s) => s.newGame);
  const location = useLocation();
  const [autoSimOpen, setAutoSimOpen] = useState(false);
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </a>
      <aside className="w-60 shrink-0 border-r bg-sidebar flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          {/* Design Bible: Brand title uses display font */}
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground font-[family-name:var(--font-display)]">
            Gallop
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5 font-[family-name:var(--font-mono)] tabular-nums">
            {gameCalendarDate(day)}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2 rounded-md bg-sidebar-accent/50">
            <p className="text-xs text-sidebar-foreground/60 font-[family-name:var(--font-body)]">Cash</p>
            {/* Design Bible: Numbers use IBM Plex Mono with tabular-nums */}
            <p className="text-lg font-bold font-[family-name:var(--font-mono)] tabular-nums text-sidebar-foreground">
              ${cash.toLocaleString()}
            </p>
          </div>
          <div className="px-3 py-1 text-xs text-sidebar-foreground/60 font-[family-name:var(--font-mono)] tabular-nums">
            {horses.length} horses
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Button
              onClick={advanceDay}
              className="col-span-1"
              size="sm"
              title="Advance 1 day"
              aria-label="Advance 1 day"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => advanceMultipleDays(7)}
              className="col-span-1 tabular-nums"
              size="sm"
              variant="secondary"
              title="Advance 1 week"
            >
              7d
            </Button>
            <Button
              onClick={() => advanceMultipleDays(30)}
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
                    newGame();
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
