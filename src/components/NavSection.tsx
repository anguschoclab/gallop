import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

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
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:ring-offset-t950";

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
          "w-full flex items-center justify-between mb-2 group rounded-md px-1 py-0.5 transition-colors hover:bg-cream/5",
          focusRing,
        )}
        aria-expanded={open}
      >
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.14em] font-[family-name:var(--font-mono)] transition-colors",
            containsActive ? "text-gold" : "text-cream-muted group-hover:text-cream",
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            containsActive ? "text-gold" : "text-cream-muted",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div id={contentId} role="region" aria-labelledby={headerId} className="space-y-0.5 mb-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item.to, item.exact);
            return (
              <div key={item.label}>
                <Link
                  to={item.to}
                  search={item.search}
                  className={cn(
                    "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors group",
                    focusRing,
                    active
                      ? "bg-gold/15 text-gold font-medium shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]"
                      : "text-cream-muted hover:text-cream hover:bg-cream/5",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gold" />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-gold" : "text-cream-muted group-hover:text-cream",
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Inbox" && unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                {item.subItems && active && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-gold-muted/40 pl-2">
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
                              ? "text-gold font-medium bg-gold/10"
                              : "text-cream-muted/70 hover:text-cream hover:bg-cream/5",
                          )}
                        >
                          <sub.icon className={cn("h-3 w-3", subActive && "text-gold")} />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {footer && <div className="pt-1.5 mt-1 border-t border-gold-muted/20">{footer}</div>}
        </div>
      )}
    </div>
  );
}
