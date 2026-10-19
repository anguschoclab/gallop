import { MAX_COMPARE_HORSES } from "@/shared/constants/uiConstants";
import { useState, useMemo } from "react";
import { TrophyCase } from "@/domains/awards/ui";
import { HorseCompare } from "@/domains/horse/ui/HorseCompare";
import { RosterFilterBar } from "@/domains/stable/ui/RosterFilterBar";
import { StableRosterLedger } from "@/domains/stable/ui/StableRosterLedger";
import { StableRosterGallery } from "@/domains/stable/ui/StableRosterGallery";
import { StableRosterCompareBar } from "@/domains/stable/ui/StableRosterCompareBar";
import { EmptyState } from "@/shared/ui/common/EmptyState";
import type { Horse } from "@/platform/game/types";
import type { RegionalAward } from "@/domains/awards/application/awardsFacade";
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
        counts.all === 0 ? (
          <EmptyState
            icon={Search}
            title="Stable is Empty"
            description="You have no horses. Visit the auction to acquire stock."
            action={{ label: "Browse auction", to: "/auction" }}
            className="shadow-2xl"
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No Records Located"
            description="Current filter parameters yielded zero matches in the registry."
            className="shadow-2xl"
          />
        )
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
