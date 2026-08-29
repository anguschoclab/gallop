import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HorsePortrait } from "@/components/horse/HorsePortrait";
import { calculateOverallRating } from "@/core/horse/stats";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { Zap, TrendingUp, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGalleryFilters, COAT_COLORS } from "@/hooks/horse/useGalleryFilters";
import {
  HORSE_TRAIT_CATEGORY_OPTIONS,
  HORSE_TRAIT_OPTIONS,
  type HorseTraitKey,
} from "@/core/common/traitLabels";

function HorseGalleryPage() {
  const {
    horses,
    coatFilter,
    setCoatFilter,
    sortBy,
    setSortBy,
    filteredHorses,
    coatCounts,
    search,
    setSearch,
    traitCategory,
    setTraitCategory,
    traitFilter,
    setTraitFilter,
  } = useGalleryFilters();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name=var(--font-display)]">
            Horse Gallery
          </h1>
          <p className="text-cream-muted font-[family-name=var(--font-body)]">
            Browse all {horses.length} horses in your stable with coat details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-muted" />
            <Input
              placeholder="Search name or trait..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] pl-8"
            />
          </div>
          <Select
            value={traitCategory}
            onValueChange={(v) => {
              setTraitCategory(v as HorseTraitKey | "all");
              setTraitFilter("all");
            }}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORSE_TRAIT_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {traitCategory !== "all" && (
            <Select value={traitFilter} onValueChange={setTraitFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORSE_TRAIT_OPTIONS[traitCategory].map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={coatFilter} onValueChange={setCoatFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COAT_COLORS.map((coat) => (
                <SelectItem key={coat.value} value={coat.value}>
                  {coat.label}
                  {coat.value !== "all" && coatCounts[coat.value] > 0 && (
                    <span className="ml-2 text-cream-muted">({coatCounts[coat.value]})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[120px]">
              <TrendingUp className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ovr">By OVR</SelectItem>
              <SelectItem value="age">By Age</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredHorses.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <p className="text-cream-muted">
              {horses.length === 0
                ? "No horses in your stable yet. Visit the market or auction to acquire stock."
                : "No horses match the selected filters."}
            </p>
            {horses.length === 0 ? (
              <div className="flex gap-2 justify-center mt-4">
                <Link to="/market">
                  <Button>Go to Market</Button>
                </Link>
                <Link to="/auction">
                  <Button variant="outline">View Auctions</Button>
                </Link>
              </div>
            ) : (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCoatFilter("all");
                    setSearch("");
                    setTraitCategory("all");
                    setTraitFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHorses.map((horse) => {
            const resolved = ensurePhenotypeResolved(horse);
            const ovr = calculateOverallRating(resolved);
            return (
              <Link
                key={horse.id}
                to="/stable/$horseId"
                params={{ horseId: horse.id }}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full border-gold-muted">
                  <div className="aspect-square bg-t700 flex items-center justify-center p-4">
                    <HorsePortrait
                      id={horse.id}
                      coatColor={horse.coatColor}
                      markings={horse.markings}
                      gender={horse.gender}
                      appearance={horse.appearance}
                      size="lg"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg truncate text-cream font-[family-name=var(--font-display)]">
                        {horse.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 border-gold-muted text-cream"
                      >
                        {ovr} OVR
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="capitalize text-xs bg-t700 text-cream">
                        {horse.coatColor?.replace("-", " ") ?? "Unknown"}
                      </Badge>
                      <span className="text-cream-muted">·</span>
                      <span className="text-cream-muted">{Math.floor(horse.age)} years</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cream-muted">
                      <Zap className="w-3 h-3" />
                      <span>Energy {horse.energy}%</span>
                      {horse.form !== 0 && (
                        <>
                          <span>·</span>
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            Form {horse.form > 0 ? "+" : ""}
                            {horse.form}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pt-2">
                      <Button variant="ghost" size="sm" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HorseGalleryPage;
