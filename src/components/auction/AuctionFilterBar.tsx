import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AuctionBrowseSearch } from "@/lib/auctionSearchSchema";

/**
 * Props for the AuctionFilterBar component.
 */
interface AuctionFilterBarProps {
  /** Current search filters. */
  search: AuctionBrowseSearch;
  /** Whether any filters are currently active. */
  hasActiveFilters: boolean;
  /** Callback to update search filters in the URL. */
  onUpdateFilter: (
    update: Partial<AuctionBrowseSearch> | ((prev: AuctionBrowseSearch) => AuctionBrowseSearch),
  ) => void;
  /** Callback to reset all filters. */
  onReset: () => void;
}

/**
 * Component to render the auction browsing filter and sort interface.
 *
 * EXTRACTED FROM: src/routes/auction.$saleId.tsx
 */
export function AuctionFilterBar({
  search,
  hasActiveFilters,
  onUpdateFilter,
  onReset,
}: AuctionFilterBarProps) {
  const { sex, ageBand, reserveBand, sort } = search;

  return (
    <div className="space-y-2">
      {/* Row 1: sex + age band */}
      <div className="flex flex-wrap gap-3 items-start">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sex</p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={sex ?? ""}
            onValueChange={(v) =>
              onUpdateFilter((prev) => ({
                ...prev,
                sex: v ? (v as AuctionBrowseSearch["sex"]) : undefined,
              }))
            }
          >
            <ToggleGroupItem value="">All</ToggleGroupItem>
            <ToggleGroupItem value="colt">Colt</ToggleGroupItem>
            <ToggleGroupItem value="filly">Filly</ToggleGroupItem>
            <ToggleGroupItem value="gelding">Gelding</ToggleGroupItem>
            <ToggleGroupItem value="mare">Mare</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Age</p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={ageBand ?? ""}
            onValueChange={(v) =>
              onUpdateFilter((prev) => ({
                ...prev,
                ageBand: v ? (v as AuctionBrowseSearch["ageBand"]) : undefined,
              }))
            }
          >
            <ToggleGroupItem value="">All</ToggleGroupItem>
            <ToggleGroupItem value="weanling">Weanling</ToggleGroupItem>
            <ToggleGroupItem value="yearling">Yearling</ToggleGroupItem>
            <ToggleGroupItem value="2yo">2yo</ToggleGroupItem>
            <ToggleGroupItem value="3yo+">3yo+</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Row 2: reserve band + reset + sort */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reserve</p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={reserveBand ?? ""}
            onValueChange={(v) =>
              onUpdateFilter((prev) => ({
                ...prev,
                reserveBand: v ? (v as AuctionBrowseSearch["reserveBand"]) : undefined,
              }))
            }
          >
            <ToggleGroupItem value="">All</ToggleGroupItem>
            <ToggleGroupItem value="under10k">Under $10k</ToggleGroupItem>
            <ToggleGroupItem value="10k-50k">$10k–$50k</ToggleGroupItem>
            <ToggleGroupItem value="over50k">Over $50k</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          )}
          <Select
            value={sort ?? "lot"}
            onValueChange={(v) =>
              onUpdateFilter((prev) => ({
                ...prev,
                sort: v === "lot" ? undefined : (v as AuctionBrowseSearch["sort"]),
              }))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort: Lot order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lot">Lot order</SelectItem>
              <SelectItem value="reserve-asc">Lowest reserve first</SelectItem>
              <SelectItem value="reserve-desc">Highest reserve first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
