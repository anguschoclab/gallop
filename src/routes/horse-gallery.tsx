import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HorsePortrait } from "@/components/HorsePortrait";
import { calculateOverallRating } from "@/core/horse/stats";
import { Zap, TrendingUp, Filter } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/horse-gallery")({
  component: HorseGalleryPage,
});

const COAT_COLORS = [
  { value: "all", label: "All Coats" },
  { value: "bay", label: "Bay" },
  { value: "black", label: "Black" },
  { value: "chestnut", label: "Chestnut" },
  { value: "dark-bay", label: "Dark Bay" },
  { value: "gray", label: "Gray" },
  { value: "roan", label: "Roan" },
  { value: "palomino", label: "Palomino" },
  { value: "white", label: "White" },
  { value: "buckskin", label: "Buckskin" },
  { value: "seal-brown", label: "Seal Brown" },
  { value: "liver-chestnut", label: "Liver Chestnut" },
  { value: "dun", label: "Dun" },
  { value: "grulla", label: "Grulla" },
  { value: "champagne", label: "Champagne" },
] as const;

function HorseGalleryPage() {
  const horses = useGame((s) => s.horses.filter((h) => h.owned));
  const [coatFilter, setCoatFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"ovr" | "age" | "name">("ovr");

  const filteredHorses = useMemo(() => {
    let result = [...horses];

    if (coatFilter !== "all") {
      result = result.filter((h) => h.coatColor === coatFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "ovr") {
        return calculateOverallRating(b) - calculateOverallRating(a);
      }
      if (sortBy === "age") {
        return a.age - b.age;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [horses, coatFilter, sortBy]);

  const coatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    horses.forEach((h) => {
      if (h.coatColor) {
        counts[h.coatColor] = (counts[h.coatColor] || 0) + 1;
      }
    });
    return counts;
  }, [horses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">Horse Gallery</h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">
            Browse all {horses.length} horses in your stable with coat details.
          </p>
        </div>
        <div className="flex gap-2">
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
                : "No horses match the selected coat filter."}
            </p>
            {horses.length === 0 && (
              <div className="flex gap-2 justify-center mt-4">
                <Link to="/market">
                  <Button>Go to Market</Button>
                </Link>
                <Link to="/auction">
                  <Button variant="outline">View Auctions</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHorses.map((horse) => {
            const ovr = calculateOverallRating(horse);
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
                      coatColor={horse.coatColor}
                      size="xl"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg truncate font-[family-name:var(--font-display)]">{horse.name}</CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0 border-gold-muted text-cream">
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
                      <span className="text-cream-muted">{horse.age} years</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cream-muted">
                      <Zap className="w-3 h-3" />
                      <span>Energy {horse.energy}%</span>
                      {horse.form !== 0 && (
                        <>
                          <span>·</span>
                          <TrendingUp className="w-3 h-3" />
                          <span>Form {horse.form > 0 ? "+" : ""}{horse.form}</span>
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
