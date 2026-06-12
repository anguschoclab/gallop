import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GRADE_OPTIONS,
  DISTANCE_OPTIONS,
  type GradeFilter,
  type DistanceFilter,
} from "@/hooks/race/useRaceBrowserFilters";

interface Props {
  gradeFilter: GradeFilter;
  setGradeFilter: (v: GradeFilter) => void;
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  trackFilter: string;
  setTrackFilter: (v: string) => void;
  distanceFilter: DistanceFilter;
  setDistanceFilter: (v: DistanceFilter) => void;
  allCountries: string[];
  allTracks: string[];
  gradeLabel: Record<GradeFilter, string>;
  onReset: () => void;
}

export function RaceBrowserFilterBar({
  gradeFilter,
  setGradeFilter,
  countryFilter,
  setCountryFilter,
  trackFilter,
  setTrackFilter,
  distanceFilter,
  setDistanceFilter,
  allCountries,
  allTracks,
  gradeLabel,
  onReset,
}: Props) {
  return (
    <Card className="border-gold-muted">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-cream">Grade</label>
            <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as GradeFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {gradeLabel[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-cream">Country</label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {allCountries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-cream">Track</label>
            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {allTracks.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-cream">Distance</label>
            <Select
              value={distanceFilter}
              onValueChange={(v) => setDistanceFilter(v as DistanceFilter)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-cream-muted hover:text-cream transition-colors"
          >
            Reset filters
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
