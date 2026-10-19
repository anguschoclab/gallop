import { Button, buttonVariants } from "@/shared/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Gavel, Plus, RotateCcw, Settings, Trophy } from "lucide-react";

import { formatCurrency } from "@/shared/common/formatting";
import { gameCalendarDate } from "@/domains/calendar/application/calendarFacade";
import { TOOLTIP_DELAY_MS, SIDEBAR_WIDTH_PX } from "@/shared/constants/uiConstants";
import {
  NavSection,
  type InboxPeekMessage,
  clearAllSidebarStorage,
} from "@/domains/shell/ui/NavSection";
import { navSections, moreNavGroup } from "@/domains/shell/ui/navModel";
import { useState } from "react";

interface SidebarNavProps {
  day: number;
  cash: number;
  horseCount: number;
  unreadCount: number;
  /** Top unread inbox messages previewed when hovering the Inbox nav item. */
  unreadMessages?: InboxPeekMessage[];
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
  unreadMessages,
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

  const groups = [...navSections, moreNavGroup];

  return (
    <aside
      className="w-[248px] shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col"
      style={{ width: SIDEBAR_WIDTH_PX }}
    >
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-[21px] font-bold text-sidebar-primary font-[family-name:var(--font-display)] tracking-[0.04em] leading-none">
          Gallop
        </h1>
        <p className="text-[9px] tracking-[0.14em] uppercase text-sidebar-foreground/60 font-[family-name:var(--font-mono)] tabular-nums mt-1 block">
          {gameCalendarDate(day)}
        </p>
      </div>
      <div
        className="p-3 border-t border-sidebar-border space-y-3 flex-1 overflow-y-auto"
        data-accordion-container
      >
        {groups.map((section, idx) => (
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items.map((item) =>
              item.label === "Inbox" ? { ...item, peekMessages: unreadMessages } : item,
            )}
            unreadCount={unreadCount}
            defaultCollapsed={idx > 0}
            resetSignal={resetSignal}
            footer={
              idx === groups.length - 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSidebar}
                  aria-label="Reset sidebar layout"
                  className="w-full justify-start text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Reset sidebar layout
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 rounded-md bg-card border border-border">
          <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">Cash</p>
          <p className="text-[22px] font-bold text-foreground font-[family-name:var(--font-mono)] tabular-nums">
            {formatCurrency(cash)}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">{horseCount} horses</p>
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
        <AlertDialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start New Game</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete your current game progress and start a new one. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setNewGameDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={onStartNewGame}
              >
                Start new game
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}
