import { Link } from "@tanstack/react-router";

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
}

export function NavSection({ label, items, unreadCount }: NavSectionProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cream-muted font-[family-name:var(--font-mono)] mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.label}>
            <Link
              to={item.to}
              search={item.search}
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
            {item.subItems && (
              <div className="ml-6 mt-1 space-y-1">
                {item.subItems.map((sub) => (
                  <Link
                    key={sub.label}
                    to={sub.to}
                    search={sub.search}
                    className="flex items-center gap-2 text-xs text-cream-muted/70 hover:text-gold transition-colors"
                    activeProps={{ className: "text-gold font-medium" }}
                  >
                    <sub.icon className="h-3 w-3" />
                    <span>{sub.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
