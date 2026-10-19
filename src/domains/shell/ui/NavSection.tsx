import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Pin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/shared/ui/hover-card";
import type { InboxCategory, InboxPriority } from "@/domains/inbox/application/inboxFacade";

/** Compact unread-message shape for the sidebar inbox hover preview. */
export interface InboxPeekMessage {
  id: string;
  day: number;
  title: string;
  category: InboxCategory;
  priority: InboxPriority;
  pinned: boolean;
}

const PEEK_PRIORITY_DOT: Record<InboxPriority, string> = {
  critical: "bg-red-500",
  urgent: "bg-red-400",
  action: "bg-primary",
  info: "bg-muted-foreground",
  low: "bg-muted-foreground/50",
};

interface NavSubItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  search?: Record<string, string>;
}

export interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  search?: Record<string, string>;
  subItems?: NavSubItem[];
  /** Unread messages previewed on hover (Message Center peek). */
  peekMessages?: InboxPeekMessage[];
}

interface NavSectionProps {
  label: string;
  items: NavItem[];
  unreadCount: number;
  defaultCollapsed?: boolean;
  resetSignal?: number;
  footer?: ReactNode;
}

export const STORAGE_PREFIX = "gallop_sidebar_section:";

// eslint-disable-next-line react-refresh/only-export-components
export function clearAllSidebarStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function isItemActive(pathname: string, to: string, exact?: boolean) {
  if (exact || to === "/") return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

function readStoredOpen(label: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + label);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function NavSection({
  label,
  items,
  unreadCount,
  defaultCollapsed,
  resetSignal,
  footer,
}: NavSectionProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const containsActive = items.some(
    (item) =>
      isItemActive(pathname, item.to, item.exact) ||
      item.subItems?.some((s) => isItemActive(pathname, s.to, s.exact)),
  );

  const [open, setOpen] = useState<boolean>(() => {
    const stored = readStoredOpen(label);
    if (stored !== null) return stored;
    return containsActive || !defaultCollapsed;
  });

  // Auto-open when active route lands inside this section
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  // Persist open state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + label, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [label, open]);

  // Reset to default state when resetSignal changes
  useEffect(() => {
    if (resetSignal && resetSignal > 0) {
      setOpen(containsActive || !defaultCollapsed);
    }
  }, [resetSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background";

  const headerId = `section-header-${label}`;
  const contentId = `section-content-${label}`;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const container = e.currentTarget.closest("[data-accordion-container]");
      if (!container) return;
      const headers = Array.from(
        container.querySelectorAll<HTMLElement>("[data-accordion-header]"),
      );
      const idx = headers.indexOf(e.currentTarget as HTMLElement);
      if (idx === -1) return;
      const nextIdx =
        e.key === "ArrowDown"
          ? (idx + 1) % headers.length
          : (idx - 1 + headers.length) % headers.length;
      headers[nextIdx]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        id={headerId}
        data-accordion-header
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between mb-2 group rounded-md px-1 py-0.5 transition-colors hover:bg-foreground/5",
          focusRing,
        )}
        aria-expanded={open}
      >
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.14em] font-[family-name:var(--font-mono)] transition-colors",
            containsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            containsActive ? "text-primary" : "text-muted-foreground",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div id={contentId} role="region" aria-labelledby={headerId} className="space-y-0.5 mb-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item.to, item.exact);
            const link = (
              <Link
                to={item.to}
                search={item.search}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors group",
                  focusRing,
                  active
                    ? "bg-primary/15 text-primary font-medium ring-1 ring-inset ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.label === "Inbox" && unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
            const peek = item.peekMessages;
            return (
              <div key={item.label}>
                {peek && peek.length > 0 ? (
                  <HoverCard openDelay={150} closeDelay={150}>
                    <HoverCardTrigger asChild>{link}</HoverCardTrigger>
                    <HoverCardContent side="right" align="start">
                      <p className="px-1 pb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground font-[family-name:var(--font-mono)]">
                        Unread messages
                      </p>
                      <div className="space-y-0.5">
                        {peek.map((m) => (
                          <Link
                            key={m.id}
                            to="/inbox"
                            className="flex items-start gap-2 rounded px-1.5 py-1.5 transition-colors hover:bg-foreground/5"
                          >
                            <span
                              className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                PEEK_PRIORITY_DOT[m.priority],
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1">
                                <span className="truncate text-xs text-foreground">{m.title}</span>
                                {m.pinned && <Pin className="h-2.5 w-2.5 shrink-0 text-primary" />}
                              </span>
                              <span className="block text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70 font-[family-name:var(--font-mono)]">
                                Day {m.day} · {m.category.replace(/_/g, " ")}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                      <Link
                        to="/inbox"
                        className="mt-1 block border-t border-border/30 px-1.5 pt-1.5 text-[10px] font-medium text-primary hover:underline"
                      >
                        Open Message Center
                      </Link>
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  link
                )}
                {item.subItems && active && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
                    {item.subItems.map((sub) => {
                      const subActive = isItemActive(pathname, sub.to, sub.exact);
                      return (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          search={sub.search}
                          className={cn(
                            "flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
                            focusRing,
                            subActive
                              ? "text-primary font-medium bg-primary/10"
                              : "text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5",
                          )}
                        >
                          <sub.icon className={cn("h-3 w-3", subActive && "text-primary")} />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {footer && <div className="pt-1.5 mt-1 border-t border-border/20">{footer}</div>}
        </div>
      )}
    </div>
  );
}
