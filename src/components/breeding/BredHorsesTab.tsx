/**
 * BredHorsesTab — Lists every horse foaled by the player's stable, regardless of
 * current ownership. Useful for tracking the legacy of your breeding program even
 * after a horse has been sold or claimed away.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Baby } from "lucide-react";
import { useGameWithShallow } from "@/game/store";
import type { GameState, Horse, Stable } from "@/game/types";
import { HorseNameLink } from "@/components/horse/HorseNameLink";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";

type Row = {
  horse: Horse;
  ownerLabel: string;
  ownerTone: "player" | "npc" | "retired";
};

export function BredHorsesTab() {
  const horses = useGameWithShallow((s: GameState) => s.horses || []);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables || []);
  const [query, setQuery] = useState("");

  const stableMap = useMemo(
    () => new Map<string, Stable>(npcStables.map((s) => [s.id, s])),
    [npcStables],
  );

  const rows: Row[] = useMemo(() => {
    return horses
      .filter((h) => h.bredByPlayer)
      .map((h) => {
        let ownerLabel = "Sold / Unknown";
        let ownerTone: Row["ownerTone"] = "retired";
        if (!h.stableId && h.owned) {
          ownerLabel = "Your Stable";
          ownerTone = "player";
        } else if (h.stableId) {
          const s = stableMap.get(h.stableId);
          ownerLabel = s?.name ?? "Rival Stable";
          ownerTone = "npc";
        }
        return { horse: h, ownerLabel, ownerTone };
      })
      .sort((a, b) => (b.horse.createdAtDay ?? 0) - (a.horse.createdAtDay ?? 0));
  }, [horses, stableMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.horse.name.toLowerCase().includes(q) ||
        r.ownerLabel.toLowerCase().includes(q) ||
        r.horse.pedigree?.sireName?.toLowerCase().includes(q) ||
        r.horse.pedigree?.damName?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const stillOwned = rows.filter((r) => r.ownerTone === "player").length;
  const placed = rows.filter((r) => r.ownerTone === "npc").length;

  return (
    <Card className="border-gold-muted">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-[family-name:var(--font-display)] flex items-center gap-2">
            <Baby className="h-4 w-4 text-gold/70" />
            Bred by Your Stable
          </CardTitle>
          <p className="text-xs text-cream-muted mt-1 font-[family-name:var(--font-body)]">
            Every horse your stable has foaled — including those now racing under other colours.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums font-[family-name:var(--font-mono)] text-cream-muted">
          <span>
            <NumericValue value={rows.length} /> total
          </span>
          <span className="opacity-40">·</span>
          <span>
            <NumericValue value={stillOwned} /> in stable
          </span>
          <span className="opacity-40">·</span>
          <span>
            <NumericValue value={placed} /> placed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-cream-muted">
            No foals on your stable's books yet. Once your mares foal, they will appear here for
            life.
          </p>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Search by foal, sire, dam, or owner…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 max-w-sm bg-t900/40 border-gold-muted/60"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-cream-muted border-b border-gold-muted">
                    <th className="py-2 pr-3 font-medium">Foal</th>
                    <th className="py-2 pr-3 font-medium">Sire × Dam</th>
                    <th className="py-2 pr-3 font-medium">Age</th>
                    <th className="py-2 pr-3 font-medium">Sex</th>
                    <th className="py-2 pr-3 font-medium">Born</th>
                    <th className="py-2 pr-3 font-medium">Current Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ horse, ownerLabel, ownerTone }) => (
                    <tr
                      key={horse.id}
                      className="border-b border-gold-muted/40 last:border-0 hover:bg-gold/5 transition-colors"
                    >
                      <td className="py-2 pr-3">
                        <HorseNameLink
                          horseId={horse.id}
                          name={horse.name}
                          className="text-cream font-medium"
                        />
                      </td>
                      <td className="py-2 pr-3 text-cream-muted">
                        {horse.pedigree?.sireName ?? "—"} ×{" "}
                        {horse.pedigree?.damName ?? "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums font-[family-name:var(--font-mono)]">
                        {horse.age}
                      </td>
                      <td className="py-2 pr-3 capitalize text-cream-muted">{horse.gender}</td>
                      <td className="py-2 pr-3 tabular-nums font-[family-name:var(--font-mono)] text-cream-muted">
                        D{horse.createdAtDay ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-[family-name:var(--font-mono)]",
                            ownerTone === "player" &&
                              "border-gold/60 text-gold bg-gold/5",
                            ownerTone === "npc" &&
                              "border-cream-muted/40 text-cream-muted",
                            ownerTone === "retired" && "border-t700 text-cream-muted/70",
                          )}
                        >
                          {ownerLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-cream-muted">
                        No matches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
