import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PedigreeTree } from "@/components/breeding/PedigreeTree";
import type { useBreedingPage } from "@/hooks/breeding/useBreedingPage";

interface BreedingPedigreeTabProps {
  pageData: ReturnType<typeof useBreedingPage>;
}

export function BreedingPedigreeTab({ pageData }: BreedingPedigreeTabProps) {
  const { sire, dam, sireId, damId, sharedAncestorIds, breedLogs } = pageData;

  return (
    <div className="space-y-4">
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">
            Ancestry Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sire && dam ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-cream/40 mb-2 font-mono uppercase tracking-widest">
                  {sire.name} · Sire · Preferred{" "}
                  <span className="text-cream tabular-nums">
                    {sire.distanceAptitude ? `${Math.round(sire.distanceAptitude)}m` : "—"}
                  </span>
                </div>
                <PedigreeTree
                  horseId={sireId}
                  generations={3}
                  sharedAncestorIds={sharedAncestorIds}
                />
              </div>
              <div>
                <div className="text-[10px] text-cream/40 mb-2 font-mono uppercase tracking-widest">
                  {dam.name} · Dam · Preferred{" "}
                  <span className="text-cream tabular-nums">
                    {dam.distanceAptitude ? `${Math.round(dam.distanceAptitude)}m` : "—"}
                  </span>
                </div>
                <PedigreeTree
                  horseId={damId}
                  generations={3}
                  sharedAncestorIds={sharedAncestorIds}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-cream-muted">
              Select a sire and dam in the Breeding Shed to compare ancestry.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">
            Breeding Attempts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {breedLogs.length === 0 ? (
            <p className="text-sm text-cream-muted p-6">No breeding attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/40 border-b border-white/5">
                  <tr className="text-[10px] uppercase tracking-widest text-cream/40 font-black">
                    <th className="px-4 py-2 text-left">Day</th>
                    <th className="px-4 py-2 text-left">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {breedLogs.map((l: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2 tabular-nums text-cream-muted">{l.day}</td>
                      <td className="px-4 py-2 text-cream">{l.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
