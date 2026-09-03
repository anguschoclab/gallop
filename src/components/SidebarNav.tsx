import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
  RotateCcw,
  BookOpen,
  Briefcase,
} from "lucide-react";

import { formatCurrency } from "@/core/common/formatting";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { DAYS_PER_WEEK, DAYS_PER_MONTH, TOOLTIP_DELAY_MS, SIDEBAR_WIDTH_PX } from "@/constants";
import { NavSection, type NavItem, clearAllSidebarStorage } from "./NavSection";
import { useState } from "react";

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Headquarters",
    items: [
      { to: "/", label: "Dashboard", icon: Home, exact: true },
      { to: "/inbox", label: "Inbox", icon: Bell, exact: false },
      { to: "/briefing", label: "Briefing", icon: Newspaper, exact: false },
      { to: "/gazette", label: "Gazette", icon: Newspaper, exact: false },
      { to: "/recap", label: "Recap", icon: RotateCcw, exact: false },
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
      { to: "/broodmares", label: "Broodmares", icon: Heart, exact: false },
      { to: "/staff", label: "Staff", icon: Users, exact: false },
      { to: "/jockeys", label: "Jockeys", icon: User, exact: false },
      { to: "/facilities", label: "Facilities", icon: Building2, exact: false },
      { to: "/honors", label: "Honors", icon: Award, exact: false },
      { to: "/hall-of-fame", label: "Hall of Fame", icon: Trophy, exact: false },
      { to: "/awards", label: "Awards", icon: Award, exact: false },
    ],
  },
  {
    label: "The World",
    items: [
      { to: "/racing", label: "Racing", icon: Calendar, exact: false },
      { to: "/calendar", label: "Calendar", icon: Calendar, exact: false },
      { to: "/records", label: "Records", icon: BarChart3, exact: false },
      { to: "/almanac", label: "Almanac", icon: BookOpen, exact: false },

      { to: "/market", label: "Market", icon: Store, exact: false },
      { to: "/portfolio", label: "Portfolio", icon: Briefcase, exact: false },
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
  isAdvancing?: boolean;
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
  isAdvancing,
  onAdvanceDay,
  onAdvanceWeek,
  onAdvanceMonth,
  onOpenAutoSim,
  onSkipToAuction,
  onSkipToRace,
  onStartNewGame,
}: SidebarNavProps) {
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  function handleResetSidebar() {
    clearAllSidebarStorage();
    setResetSignal((n) => n + 1);
  }

  return (
    <aside
      className="w-[248px] shrink-0 border-r border-gold-muted bg-t950 flex flex-col"
      style={{ width: SIDEBAR_WIDTH_PX }}
    >
      <div className="p-5 border-b border-gold-muted">
        <h1 className="text-[21px] font-bold text-gold font-[family-name:var(--font-display)] tracking-[0.04em] leading-none">
          Gallop
        </h1>
        <p className="text-[9px] tracking-[0.14em] uppercase text-cream-muted font-[family-name:var(--font-mono)] tabular-nums mt-1 block">
          {gameCalendarDate(day)}
        </p>
      </div>
      <div
        className="p-3 border-t border-gold-muted space-y-3 flex-1 overflow-y-auto"
        data-accordion-container
      >
        {navSections.map((section, idx) => (
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items}
            unreadCount={unreadCount}
            defaultCollapsed={idx > 0}
            resetSignal={resetSignal}
            footer={
              idx === 3 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSidebar}
                  aria-label="Reset sidebar layout"
                  className="w-full justify-start text-[10px] text-cream-muted hover:text-cream"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Reset sidebar layout
                </Button>
              ) : undefined
            }
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
            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onAdvanceDay}
                    className="col-span-1"
                    size="sm"
                    variant="outline"
                    aria-label="Advance 1 day"
                    disabled={isAdvancing}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Advance 1 day</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onAdvanceWeek}
                    className="col-span-1"
                    size="sm"
                    variant="outline"
                    aria-label="Advance 1 week"
                    disabled={isAdvancing}
                  >
                    7d
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Advance 1 week</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onAdvanceMonth}
                    className="col-span-1"
                    size="sm"
                    variant="outline"
                    aria-label="Advance 1 month"
                    disabled={isAdvancing}
                  >
                    30d
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Advance 1 month</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenAutoSim}
                    className="col-span-1"
                    size="sm"
                    variant="outline"
                    aria-label="AutoSim settings"
                    disabled={isAdvancing}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AutoSim settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSkipToAuction}
                    size="sm"
                    variant="outline"
                    aria-label="Skip to next auction"
                    className="text-[10px]"
                    disabled={isAdvancing}
                  >
                    <Gavel className="h-3 w-3 mr-1" /> Next Auction
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip to next auction</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSkipToRace}
                    size="sm"
                    variant="outline"
                    aria-label="Skip to next race"
                    className="text-[10px]"
                    disabled={isAdvancing}
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
