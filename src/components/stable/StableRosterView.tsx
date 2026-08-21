import { MAX_COMPARE_HORSES } from "@/constants";
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { TrophyCase } from "@/components/awards";
import { HorseCompare } from "@/components/horse/HorseCompare";
import { buttonVariants } from "@/components/ui/button";
import { RosterFilterBar } from "./RosterFilterBar";
import { StableRosterLedger } from "./StableRosterLedger";
import { StableRosterGallery } from "./StableRosterGallery";
import { StableRosterCompareBar } from "./StableRosterCompareBar";
import { cn } from "@/lib/cn";
import type { Horse } from "@/game/types";
import type { RegionalAward } from "@/core/awards/types";
import { Search } from "lucide-react";

type NavigateFn = (opts: {
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
}) => void;

interface StableRosterViewProps {
  horses: Horse[];
  status: string;
  view: "ledger" | "gallery";
  counts: {
    active: number;
    retired: number;
    auctioned: number;
    all: number;
  };
  playerAwards: RegionalAward[];
  navigate: NavigateFn;
  compareIds?: string[];
  onCompareIdsChange?: (ids: string[]) => void;
}

export function StableRosterView({
  horses,
  status,
  view,
  counts,
  playerAwards,
  navigate,
  compareIds: externalCompareIds,
  onCompareIdsChange,
}: StableRosterViewProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const selectedIds = externalCompareIds ?? internalSelectedIds;

  const toggleSelect = (id: string) => {
    const update = (prev: string[]) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE_HORSES) return prev;
      return [...prev, id];
    };
    if (onCompareIdsChange) {
      onCompareIdsChange(update(selectedIds));
    } else {
      setInternalSelectedIds(update);
    }
  };

  const setSelectedIds = (ids: string[]) => {
    if (onCompareIdsChange) {
      onCompareIdsChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const selectedHorses = useMemo(
    () => selectedIds.map((id) => horseMap.get(id)).filter(Boolean) as Horse[],
    [selectedIds, horseMap],
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

      <RosterFilterBar
        status={status}
        counts={counts}
        onStatusChange={(key) => navigate({ search: (prev) => ({ ...prev, status: key }) })}
      />

      {horses.length === 0 ? (
        <div className="p-20 text-center space-y-4 bg-black/10 border border-white/5 shadow-2xl">
          {counts.all === 0 ? (
            <>
              <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Search className="h-6 w-6 text-cream/10" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
                    Stable is Empty
                  </p>
                  <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter mt-1">
                    You have no horses. Visit the market or auction to acquire stock.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/market"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "font-mono text-xs uppercase font-bold tracking-tighter",
                    )}
                  >
                    Go to Market
                  </Link>
                  <Link
                    to="/auction"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "font-mono text-xs uppercase font-bold tracking-tighter",
                    )}
                  >
                    View Auctions
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Search className="h-6 w-6 text-cream/10" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
                  No Records Located
                </p>
                <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter">
                  Current filter parameters yielded zero matches in the registry.
                </p>
              </div>
            </>
          )}
        </div>
      ) : view === "ledger" ? (
        <StableRosterLedger horses={horses} selectedIds={selectedIds} toggleSelect={toggleSelect} />
      ) : (
        <StableRosterGallery
          horses={horses}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          navigate={navigate}
        />
      )}

      <StableRosterCompareBar
        selectedIds={selectedIds}
        horseMap={horseMap}
        toggleSelect={toggleSelect}
        setSelectedIds={setSelectedIds}
        onCompare={() => setCompareOpen(true)}
      />

      <HorseCompare
        horses={selectedHorses}
        allHorses={horses}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
    </div>
  );
}
