import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { FoalNamingDialog } from "@/components/breeding/FoalNamingDialog";
import { FoalInheritancePanel } from "@/components/horse/FoalInheritancePanel";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";
import type { useBreedingPage } from "@/hooks/breeding/useBreedingPage";

interface BreedingHistoryTabProps {
  pageData: ReturnType<typeof useBreedingPage>;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "sire", label: "By Sire Name" },
  { value: "dam", label: "By Dam Name" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "named", label: "Named Foals" },
  { value: "unnamed", label: "Unnamed Foals" },
  { value: "sold", label: "Sold Foals" },
];

interface FoalRecord {
  id: string;
  sireName: string;
  damName: string;
  foalName: string;
  foalId: string | null;
  dueDay: number;
  isOwned: boolean;
  isUnnamed: boolean;
  raw: any;
}

const SORT_FNS: Record<string, (a: FoalRecord, b: FoalRecord) => number> = {
  recent: (a, b) => b.dueDay - a.dueDay,
  oldest: (a, b) => a.dueDay - b.dueDay,
  sire: (a, b) => a.sireName.localeCompare(b.sireName),
  dam: (a, b) => a.damName.localeCompare(b.damName),
};

const FILTER_FNS: Record<string, (item: FoalRecord) => boolean> = {
  all: () => true,
  named: (r) => r.foalId !== null && !r.isUnnamed,
  unnamed: (r) => r.foalId !== null && r.isUnnamed,
  sold: (r) => r.foalId === null,
};

export function BreedingHistoryTab({ pageData }: BreedingHistoryTabProps) {
  const { pregnancies, breedLogs, localHorseMap, namingFoalId, setNamingFoalId } = pageData;

  const foalRecords: FoalRecord[] = pregnancies
    .filter((p: any) => p.resolved)
    .map((p: any) => {
      const foal = localHorseMap.get(p.foalId);
      return {
        id: p.id,
        sireName: p.sireName,
        damName: p.damName,
        foalName: foal?.name ?? "(sold)",
        foalId: foal?.id ?? null,
        dueDay: p.dueDay,
        isOwned: foal?.owned ?? false,
        isUnnamed: foal?.name === "Unnamed Foal",
        raw: p,
      };
    });

  const { sortValue, setSortValue, filterValue, setFilterValue, processed } =
    useLeaderboardControls<FoalRecord>({
      items: foalRecords,
      sortOptions: SORT_OPTIONS,
      filterOptions: FILTER_OPTIONS,
      sortFns: SORT_FNS,
      filterFns: FILTER_FNS,
      defaultSort: "recent",
      defaultFilter: "all",
    });

  return (
    <div className="space-y-4">
      <LeaderboardHeading title="Past Foals" description="Breeding records and foal outcomes." />

      {foalRecords.length === 0 ? (
        <LeaderboardEmpty message="No foals born yet." />
      ) : (
        <LeaderboardShell
          title="Foaling Records"
          icon={<FileText className="h-4 w-4 text-primary" />}
        >
          <LeaderboardControlsBar
            sortOptions={SORT_OPTIONS}
            sortValue={sortValue}
            onSortChange={setSortValue}
            filterOptions={FILTER_OPTIONS}
            filterValue={filterValue}
            onFilterChange={setFilterValue}
          />
          {processed.map((record, index) => {
            const foal = record.foalId ? localHorseMap.get(record.foalId) : null;
            const sire = foal?.sireId ? localHorseMap.get(foal.sireId) : undefined;
            const dam = foal?.damId ? localHorseMap.get(foal.damId) : undefined;
            return (
              <div key={record.id} className="space-y-2">
                <LeaderboardRow
                  rank={index + 1}
                  name={record.foalName}
                  meta={`${record.sireName} × ${record.damName} · Born day ${record.dueDay}`}
                  badges={
                    record.isUnnamed && record.isOwned ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-info hover:text-white"
                        onClick={() => setNamingFoalId(record.foalId!)}
                      >
                        Name Foal
                      </Button>
                    ) : record.foalId === null ? (
                      <Badge variant="outline" className="text-xs">
                        Sold
                      </Badge>
                    ) : undefined
                  }
                  value={`D${record.dueDay}`}
                  valueLabel="Born"
                />
                {foal && sire && dam && <FoalInheritancePanel foal={foal} sire={sire} dam={dam} />}
              </div>
            );
          })}
        </LeaderboardShell>
      )}

      <FoalNamingDialog
        foalId={namingFoalId || ""}
        isOpen={!!namingFoalId}
        onClose={() => setNamingFoalId(null)}
      />

      <LeaderboardShell title="Breeding Log" icon={<FileText className="h-4 w-4 text-primary" />}>
        {breedLogs.length === 0 ? (
          <LeaderboardEmpty message="No breeding events yet." />
        ) : (
          breedLogs.map((l: any, i: number) => (
            <LeaderboardRow
              key={i}
              rank={i + 1}
              name={l.text}
              value={`D${l.day}`}
              valueLabel="Day"
            />
          ))
        )}
      </LeaderboardShell>
    </div>
  );
}
