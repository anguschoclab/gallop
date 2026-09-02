import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardRow,
  LeaderboardShell,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";
import type { TrackRecord } from "@/core/history/historyTypes";

const SORT_OPTIONS = [
  { value: "track", label: "Track Name" },
  { value: "time", label: "Time (Fastest)" },
  { value: "distance", label: "Distance" },
  { value: "year", label: "Year" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Turf", label: "Turf" },
  { value: "Dirt", label: "Dirt" },
  { value: "Synthetic", label: "Synthetic" },
];

const SORT_FNS: Record<string, (a: TrackRecord, b: TrackRecord) => number> = {
  track: (a, b) => a.trackName.localeCompare(b.trackName),
  time: (a, b) => a.time - b.time,
  distance: (a, b) => a.distance - b.distance,
  year: (a, b) => b.year - a.year,
};

const FILTER_FNS: Record<string, (item: TrackRecord) => boolean> = {
  all: () => true,
  Turf: (r) => r.surface === "Turf",
  Dirt: (r) => r.surface === "Dirt",
  Synthetic: (r) => r.surface === "Synthetic",
};

const surfaceColor = (surface: string) => {
  if (surface === "Turf") return "bg-green-500/20 text-green-500";
  if (surface === "Dirt") return "bg-amber-900/30 text-amber-600";
  return "bg-blue-500/20 text-blue-500";
};

export function TrackRecordsTable({ records }: { records: TrackRecord[] }) {
  const { sortValue, setSortValue, filterValue, setFilterValue, processed } =
    useLeaderboardControls<TrackRecord>({
      items: records,
      sortOptions: SORT_OPTIONS,
      filterOptions: FILTER_OPTIONS,
      sortFns: SORT_FNS,
      filterFns: FILTER_FNS,
      defaultSort: "track",
      defaultFilter: "all",
    });

  if (records.length === 0) {
    return (
      <LeaderboardEmpty message="No track records set yet. Records are established by winning horses." />
    );
  }

  return (
    <LeaderboardShell
      title="All-Time Track Records"
      icon={<Timer className="h-4 w-4 text-primary" />}
    >
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
        filterOptions={FILTER_OPTIONS}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
      />
      {processed.map((record, index: number) => (
        <LeaderboardRow
          key={`${record.trackId}_${record.surface}_${record.distance}`}
          rank={index + 1}
          name={record.trackName}
          meta={`${record.distance}m · ${record.horseName} · Year ${record.year}`}
          badges={
            <Badge variant="outline" className={`text-xs ${surfaceColor(record.surface)}`}>
              {record.surface}
            </Badge>
          }
          value={
            <RaceTimeDisplay seconds={record.time} distance={record.distance} className="text-sm" />
          }
          valueLabel="Time"
        />
      ))}


    </LeaderboardShell>
  );
}
