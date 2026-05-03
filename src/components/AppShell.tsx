import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Home, Trophy, Store, Calendar, Plus, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, exact: true },
  { to: "/stable", label: "Stable", icon: Trophy, exact: false },
  { to: "/races", label: "Races", icon: Calendar, exact: false },
  { to: "/breeding", label: "Breeding", icon: Heart, exact: false },
  { to: "/market", label: "Market", icon: Store, exact: false },
] as const;

export function AppShell() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);
  const advanceDay = useGame((s) => s.advanceDay);
  const newGame = useGame((s) => s.newGame);
  const location = useLocation();

  // Hide chrome for live race screen
  const isRace = location.pathname.startsWith("/race/");
  if (isRace) return <Outlet />;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
        <div className="p-5 border-b">
          <h1 className="text-lg font-bold tracking-tight">Stable Manager</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Day {day}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="px-3 py-2 rounded-md bg-muted">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="text-lg font-bold tabular-nums">${cash.toLocaleString()}</p>
          </div>
          <div className="px-3 py-1 text-xs text-muted-foreground">{horses.length} horses</div>
          <Button onClick={advanceDay} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Advance Day
          </Button>
          <Button
            onClick={() => {
              if (confirm("Start a new game? All progress will be lost.")) newGame();
            }}
            className="w-full"
            size="sm"
            variant="ghost"
          >
            New Game
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
