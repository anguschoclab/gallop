import { Link } from "@tanstack/react-router";
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
  Home, Trophy, Store, Calendar, Plus, Heart, Gavel, Settings, User, Baby,
  DollarSign, Building2, Award, Users, Map, Clock, LayoutGrid, Star, Bell,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { DAYS_PER_WEEK, DAYS_PER_MONTH } from "@/constants/game";
import { useState } from "react";

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

interface SidebarNavProps {
  day: number;
  cash: number;
  horseCount: number;
  unreadCount: number;
  onAdvanceDay: () => void;
  onAdvanceWeek: () => void;
  onAdvanceMonth: () => void;
  onOpenAutoSim: () => void;
  onSkipToAuction: () => void;
  onSkipToRace: () => void;
  onStartNewGame: () => void;
}

export function SidebarNav({
  day,
  cash,
  horseCount,
  unreadCount,
  onAdvanceDay,
  onAdvanceWeek,
  onAdvanceMonth,
  onOpenAutoSim,
  onSkipToAuction,
  onSkipToRace,
  onStartNewGame,
}: SidebarNavProps) {
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);

  return (
    <aside className="w-[248px] shrink-0 border-r border-gold-muted bg-t950 flex flex-col">
      <div className="p-5 border-b border-gold-muted">
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
                  activeProps={{ className: "text-gold font-medium" }}
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
          <p className="text-[22px] font-bold text-cream font-[family-name:var(--font-mono)] tabular-nums">
            ${cash.toLocaleString()}
          </p>
          <p className="text-[10px] text-cream-muted/60 mt-1">{horseCount} horses</p>
          <div className="grid grid-cols-4 gap-1">
            <Button onClick={onAdvanceDay} className="col-span-1" size="sm" variant="outline" aria-label="Advance 1 day">
              <Plus className="h-3 w-3" />
            </Button>
            <Button onClick={onAdvanceWeek} className="col-span-1" size="sm" variant="outline" title="Advance 1 week" aria-label="Advance 1 week">
              7d
            </Button>
            <Button onClick={onAdvanceMonth} className="col-span-1" size="sm" variant="outline" title="Advance 1 month" aria-label="Advance 1 month">
              30d
            </Button>
            <Button onClick={onOpenAutoSim} className="col-span-1" size="sm" variant="outline" aria-label="AutoSim settings">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <Button onClick={onSkipToAuction} size="sm" variant="outline" title="Skip to next auction" className="text-[10px]">
              <Gavel className="h-3 w-3 mr-1" /> Next Auction
            </Button>
            <Button onClick={onSkipToRace} size="sm" variant="outline" title="Skip to next race" className="text-[10px]">
              <Trophy className="h-3 w-3 mr-1" /> Next Race
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
              <Button variant="destructive" onClick={onStartNewGame}>
                Start new game
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
