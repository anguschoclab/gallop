import { useMemo, useState } from "react";
import { ExternalLink, Search, Trophy } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { formatCurrency } from "@/shared/common/formatting";
import {
  REAL_HORSE_BUILT_AT,
  realHorses,
  realHorsesWithRecords,
  realHorseWikiUrl,
  type RealHorse,
} from "@/shared/data/realHorses";
import {
  REAL_LEADERBOARD_LABELS,
  closestRealCareers,
  realAncestry,
  realLeaderboard,
  searchRealHorses,
  type RealLeaderboardKind,
} from "@/domains/history/application/historyFacade";
import { useGameWithShallow } from "@/platform/game/store";
import { isPlayerOwned } from "@/domains/horse/application/horseFacade";
import type { GameState, Horse } from "@/platform/game/types";
import { cn } from "@/shared/lib/cn";

const KINDS: RealLeaderboardKind[] = ["wins", "earnings", "timeform", "unbeaten", "bigWins"];

function recordLine(h: RealHorse): string {
  if (!h.starts) return "Record not documented";
  return `${h.starts}: ${h.wins ?? 0}-${h.seconds ?? 0}-${h.thirds ?? 0}`;
}

function RealHorseRow({
  h,
  rank,
  active,
  onSelect,
}: {
  h: RealHorse;
  rank?: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-md border px-3 py-2 flex items-center gap-3 transition-colors",
        active ? "border-primary bg-primary/10" : "border-border/40 hover:bg-muted/40",
      )}
    >
      {rank !== undefined && (
        <span className="w-6 text-xs text-muted-foreground tabular-nums">{rank}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground truncate">{h.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {[h.foaled, h.country].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <div className="text-right text-xs tabular-nums">
        <div className="text-foreground">{recordLine(h)}</div>
        <div className="text-muted-foreground">
          {h.earningsUsd ? formatCurrency(h.earningsUsd) : ""}
          {h.timeform ? ` · TF ${h.timeform}` : ""}
        </div>
      </div>
    </button>
  );
}

function RealHorseDetail({ h, onSelect }: { h: RealHorse; onSelect: (h: RealHorse) => void }) {
  const anc = useMemo(() => realAncestry(h), [h]);
  const url = realHorseWikiUrl(h);
  const link = (x?: RealHorse) =>
    x ? (
      <button type="button" className="text-primary hover:underline" onClick={() => onSelect(x)}>
        {x.name}
      </button>
    ) : (
      <span className="text-muted-foreground">Unknown</span>
    );
  return (
    <Card className="border-border/40 bg-card/60">
      <CardContent className="p-4 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-foreground">{h.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[
                h.sex === "F"
                  ? "Mare"
                  : h.gelding
                    ? "Gelding"
                    : h.sex === "M"
                      ? "Horse"
                      : undefined,
                h.colour,
                h.foaled && `foaled ${h.foaled}`,
                h.died && `died ${h.died}`,
                h.country,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 shrink-0"
            >
              Wikipedia <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-muted/40 p-2">
            <div className="text-xs text-muted-foreground">Record</div>
            <div className="font-semibold tabular-nums">{recordLine(h)}</div>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <div className="text-xs text-muted-foreground">Earnings (≈USD)</div>
            <div className="font-semibold tabular-nums">
              {h.earningsUsd ? formatCurrency(h.earningsUsd) : "—"}
            </div>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <div className="text-xs text-muted-foreground">Timeform</div>
            <div className="font-semibold tabular-nums">{h.timeform ?? "—"}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div>Sire: {link(anc.sire)}</div>
          <div>
            Dam: {link(anc.dam)}
            {anc.damsire && <> (by {link(anc.damsire)})</>}
          </div>
          {anc.sireline.length > 1 && (
            <div className="text-xs text-muted-foreground">
              Male line: {anc.sireline.map((x) => x.name).join(" ← ")}
            </div>
          )}
          {(h.trainer || h.breeder) && (
            <div className="text-xs text-muted-foreground">
              {h.trainer && `Trainer: ${h.trainer}`}
              {h.trainer && h.breeder && " · "}
              {h.breeder && `Breeder: ${h.breeder}`}
            </div>
          )}
        </div>
        {h.majorWins && h.majorWins.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Big-race wins</div>
            <div className="flex flex-wrap gap-1">
              {h.majorWins.map((w) => (
                <Badge key={w} variant="outline" className="text-xs">
                  {w}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {h.awards && h.awards.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Awards</div>
            <ul className="text-xs list-disc pl-4 space-y-0.5">
              {h.awards.slice(0, 8).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Almanac tab: real thoroughbreds from Wikidata + Wikipedia. */
export function RealHorsesPanel() {
  const [kind, setKind] = useState<RealLeaderboardKind>("wins");
  const [query, setQuery] = useState("");
  const board = useMemo(() => realLeaderboard(kind), [kind]);
  const results = useMemo(() => searchRealHorses(query), [query]);
  const [selected, setSelected] = useState<RealHorse | undefined>(undefined);
  const shown = selected ?? board[0];

  const horses = useGameWithShallow((s: GameState) => s.horses ?? {});
  const mine = useMemo(
    () =>
      (Object.values(horses) as Horse[])
        .filter((h) => isPlayerOwned(h) && (h.careerStarts ?? 0) > 0)
        .sort((a, b) => (b.lifetimeEarnings ?? 0) - (a.lifetimeEarnings ?? 0))
        .slice(0, 6),
    [horses],
  );

  const withRecords = useMemo(() => realHorsesWithRecords().length, []);

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-4 text-xs text-muted-foreground flex items-start gap-2">
          <Trophy className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <span>
            {realHorses.length.toLocaleString()} real thoroughbreds ({withRecords.toLocaleString()}{" "}
            with documented race records) from Wikidata and Wikipedia, snapshot{" "}
            {REAL_HORSE_BUILT_AT}. The same horses stand behind the family trees in your game.
            Earnings are converted to US dollars at today's rates.
          </span>
        </CardContent>
      </Card>

      {mine.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Your horses' closest real careers
            </h3>
            {mine.map((h) => {
              const match = closestRealCareers(
                { starts: h.careerStarts, wins: h.careerWins, earnings: h.lifetimeEarnings },
                1,
              )[0];
              return (
                <div key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {h.name}{" "}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {h.careerStarts}: {h.careerWins} wins · {formatCurrency(h.lifetimeEarnings)}
                    </span>
                  </span>
                  {match && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline shrink-0"
                      onClick={() => setSelected(match.horse)}
                    >
                      ≈ {match.horse.name} ({recordLine(match.horse)})
                    </button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a real horse, e.g. Frankel"
              className="pl-8"
              aria-label="Search real horses"
            />
          </div>
          {query.trim().length >= 2 ? (
            <div className="space-y-1.5">
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground">No real horse by that name.</p>
              )}
              {results.map((h) => (
                <RealHorseRow
                  key={h.id}
                  h={h}
                  active={shown?.id === h.id}
                  onSelect={() => setSelected(h)}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={k === kind ? "default" : "outline"}
                    onClick={() => {
                      setKind(k);
                      setSelected(undefined);
                    }}
                  >
                    {REAL_LEADERBOARD_LABELS[k]}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                {board.map((h, i) => (
                  <RealHorseRow
                    key={h.id}
                    h={h}
                    rank={i + 1}
                    active={shown?.id === h.id}
                    onSelect={() => setSelected(h)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div>{shown && <RealHorseDetail h={shown} onSelect={setSelected} />}</div>
      </div>
    </div>
  );
}
