import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { type RegionConfig, REGION_LIST } from "@/core/calendar/regions";

interface RegionSwitcherProps {
  currentRegion: RegionConfig;
}

export function RegionSwitcher({ currentRegion }: RegionSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Region:</span>
      <div className="flex flex-wrap gap-1 max-w-[400px] justify-end">
        {REGION_LIST.map((r) => (
          <Link
            key={r.id}
            to="/calendar/$regionId"
            params={{ regionId: r.id }}
          >
            <Button
              variant={r.id === currentRegion.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {r.name}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
