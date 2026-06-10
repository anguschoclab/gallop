import { Link } from "@tanstack/react-router";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  subItems?: { to: string; label: string; icon: React.ElementType; exact?: boolean }[];
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
  );
}
