import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
  DollarSign,
  Building2,
  Award,
  Users,
  Map,
  LayoutGrid,
  BarChart3,
  Bookmark,
  Bell,
  Newspaper,
} from "lucide-react";

import { formatCurrency } from "@/core/common/formatting";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { DAYS_PER_WEEK, DAYS_PER_MONTH } from "@/constants";
import { NavSection } from "./NavSection";
import { useState } from "react";

const navSections = [
  {
    label: "Headquarters",
    items: [
      { to: "/", label: "Dashboard", icon: Home, exact: true },
      { to: "/inbox", label: "Inbox", icon: Bell, exact: false },
      { to: "/briefing", label: "Briefing", icon: Newspaper, exact: false },
      { to: "/analytics", label: "Analytics", icon: BarChart3, exact: false },
      { to: "/financial-report", label: "Finances", icon: DollarSign, exact: false },
      { to: "/bookmarks", label: "Bookmarks", icon: Bookmark, exact: false },
    ],
  },
  {
    label: "My Stable",
    items: [
      { to: "/stable", label: "Stables", icon: Trophy, exact: false },
      { to: "/horse-gallery", label: "Horses", icon: LayoutGrid, exact: false },
      { to: "/breeding", label: "Breeding", icon: Heart, exact: false },
      { to: "/staff", label: "Staff", icon: Users, exact: false },
      { to: "/jockeys", label: "Jockeys", icon: User, exact: false },
      { to: "/facilities", label: "Facilities", icon: Building2, exact: false },
      { to: "/honors", label: "Honors", icon: Award, exact: false },
    ],
  },
  {
    label: "The World",
    items: [
      { to: "/racing", label: "Racing", icon: Calendar, exact: false },
      { to: "/market", label: "Market", icon: Store, exact: false },
      { to: "/auction", label: "Auctions", icon: Gavel, exact: false },
      { to: "/npc-stables", label: "Stables", icon: Map, exact: false },
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
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items as any}
            unreadCount={unreadCount}
          />
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
            <Button
              onClick={onAdvanceDay}
              className="col-span-1"
              size="sm"
              variant="outline"
              aria-label="Advance 1 day"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              onClick={onAdvanceWeek}
              className="col-span-1"
              size="sm"
              variant="outline"
              aria-label="Advance 1 week"
            >
              7d
            </Button>
            <Button
              onClick={onAdvanceMonth}
              className="col-span-1"
              size="sm"
              variant="outline"
              aria-label="Advance 1 month"
            >
              30d
            </Button>
            <Button
              onClick={onOpenAutoSim}
              className="col-span-1"
              size="sm"
              variant="outline"
              aria-label="AutoSim settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSkipToAuction}
                    size="sm"
                    variant="outline"
                    aria-label="Skip to next auction"
                    className="text-[10px]"
                  >
                    <Gavel className="h-3 w-3 mr-1" /> Next Auction
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip to next auction</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSkipToRace}
                    size="sm"
                    variant="outline"
                    aria-label="Skip to next race"
                    className="text-[10px]"
                  >
                    <Trophy className="h-3 w-3 mr-1" /> Next Race
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip to next race</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                This will delete your current game progress and start a new one. This action cannot
                be undone.
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
