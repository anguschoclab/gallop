import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface NavSubItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  search?: Record<string, string>;
}

interface NavItem {
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
}

function isItemActive(pathname: string, to: string, exact?: boolean) {
  if (exact || to === "/") return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

export function NavSection({ label, items, unreadCount, defaultCollapsed }: NavSectionProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const containsActive = items.some(
    (item) =>
      isItemActive(pathname, item.to, item.exact) ||
      item.subItems?.some((s) => isItemActive(pathname, s.to, s.exact)),
  );

  const [open, setOpen] = useState(containsActive || !defaultCollapsed);

  // Auto-open when active route lands inside this section
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-2 group"
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
            "h-3 w-3 text-cream-muted transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="space-y-0.5 mb-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item.to, item.exact);
            return (
              <div key={item.label}>
                <Link
                  to={item.to}
                  search={item.search}
                  className={cn(
                    "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors group",
                    active
                      ? "bg-gold/10 text-gold font-medium"
                      : "text-cream-muted hover:text-cream hover:bg-cream/5",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-gold" />
                  )}
                  <item.icon className={cn("h-4 w-4", active && "text-gold")} />
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
                            subActive
                              ? "text-gold font-medium bg-gold/10"
                              : "text-cream-muted/70 hover:text-cream",
                          )}
                        >
                          <sub.icon className="h-3 w-3" />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
