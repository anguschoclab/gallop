import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FoalNamingDialog } from "@/components/breeding/FoalNamingDialog";
import type { useBreedingPage } from "@/hooks/breeding/useBreedingPage";

interface BreedingHistoryTabProps {
  pageData: ReturnType<typeof useBreedingPage>;
}

export function BreedingHistoryTab({ pageData }: BreedingHistoryTabProps) {
  const { pregnancies, breedLogs, localHorseMap, namingFoalId, setNamingFoalId } = pageData;

  return (
    <div className="space-y-4">
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">Past Foals</CardTitle>
        </CardHeader>
        <CardContent>
          {pregnancies.filter((p: any) => p.resolved).length === 0 ? (
            <p className="text-sm text-cream-muted">No foals born yet.</p>
          ) : (
            <div className="space-y-2">
              {pregnancies
                .filter((p: any) => p.resolved)
                .map((p: any) => {
                  const foal = localHorseMap.get(p.foalId);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border border-gold-muted rounded-md px-3 py-2 text-sm"
                    >
                      <span>
                        {p.sireName} × {p.damName} →{" "}
                        <span className="font-medium">{foal?.name ?? "(sold)"}</span>
                        {foal?.name === "Unnamed Foal" && foal.owned && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 ml-2 text-info hover:text-white"
                            onClick={() => setNamingFoalId(foal.id)}
                          >
                            Name Foal
                          </Button>
                        )}
                      </span>
                      <span className="text-cream-muted tabular-nums">Born day {p.dueDay}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <FoalNamingDialog
        foalId={namingFoalId || ""}
        isOpen={!!namingFoalId}
        onClose={() => setNamingFoalId(null)}
      />

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">Breeding Log</CardTitle>
        </CardHeader>
        <CardContent>
          {breedLogs.length === 0 ? (
            <p className="text-sm text-cream-muted">No breeding events yet.</p>
          ) : (
            <div className="space-y-1">
              {breedLogs.map((l: any, i: number) => (
                <div
                  key={i}
                  className="text-sm py-1 border-b border-gold-muted last:border-0 flex gap-3"
                >
                  <span className="text-cream-muted tabular-nums shrink-0">D{l.day}</span>
                  <span className="text-cream">{l.text}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
