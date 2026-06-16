import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStallionFilters } from "@/hooks/stable/useStallionFilters";
import { MyStallionCard } from "@/components/breeding/MyStallionCard";
import { StallionCard } from "@/components/breeding/StallionCard";
import { calculateRecommendedStudFee } from "@/core/breeding/stallions";

export function StallionsTab() {
  const {
    day,
    cash,
    breed,
    updateStudFee,
    horses,
    npcStables,
    myStallions,
    filtered,
    eligibleMares,
    selectedMare,
    selectedMareId,
    setSelectedMareId,
    hemisphere,
    setHemisphere,
    stableNameFor,
  } = useStallionFilters();

  return (
    <Tabs defaultValue="roster" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md bg-t900/50">
        <TabsTrigger value="roster">Stallion Roster</TabsTrigger>
        <TabsTrigger value="manage">My Stallions ({myStallions.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="roster" className="space-y-6 mt-6">
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="text-cream font-[family-name:var(--font-display)]">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cream-muted">Hemisphere</label>
              <Select value={hemisphere} onValueChange={(v) => setHemisphere(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Northern">Northern</SelectItem>
                  <SelectItem value="Southern">Southern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-cream-muted">Your mare</label>
              <Select value={selectedMareId} onValueChange={setSelectedMareId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a mare to book…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMares.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} (age {m.age}, {m.hemisphere}, {Math.round(m.distanceAptitude)}m)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((stallion: any) => (
            <StallionCard
              key={stallion.id}
              stallion={stallion}
              stableName={stableNameFor(stallion.stableId)}
              day={day}
              mare={selectedMare}
              cash={cash}
              onBook={() => {
                if (!selectedMare) return;
                const result = breed(stallion.id, selectedMare.id, false);
                if (!result.ok) alert(result.reason);
              }}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-cream-muted col-span-full">
              No stallions are currently standing at stud in the selected hemisphere.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="manage" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myStallions.map((stallion: any) => (
            <MyStallionCard
              key={stallion.id}
              stallion={stallion}
              day={day}
              recommendedFee={calculateRecommendedStudFee(stallion, {
                horses,
                npcStables,
              } as any)}
              onUpdateFee={(fee) => {
                const result = updateStudFee(stallion.id, fee);
                if (!result.ok) alert(result.reason);
              }}
            />
          ))}
          {myStallions.length === 0 && (
            <p className="text-sm text-cream-muted col-span-full">
              You don't have any stallions at stud. Retire a colt or horse to stud from their
              stable page.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
