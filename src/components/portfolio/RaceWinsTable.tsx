/**
 * RaceWinsTable.tsx - Player race wins and prize money earnings
 *
 * Lists every race the player has won: the race name, grade, winning horse,
 * race conditions, speed figure, and exact prize money payout, alongside
 * aggregate racing earnings metrics.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/common/StatCard";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { formatCurrency } from "@/lib/formatting";
import { gradeColor } from "@/services/common/commonFacade";
import { playerRaceWinsSummary, type PlayerRaceWinRecord } from "@/services/stable/stableFacade";

const GRADE_FILTERS = ["all", "graded", "G1", "G2", "G3", "ungraded"] as const;
type GradeFilter = (typeof GRADE_FILTERS)[number];

type SortKey = "day" | "raceName" | "horseName" | "payout" | "beyer";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "day", label: "Day", numeric: true },
  { key: "raceName", label: "Race", numeric: false },
  { key: "horseName", label: "Horse", numeric: false },
  { key: "beyer", label: "Beyer", numeric: true },
  { key: "payout", label: "Payout", numeric: true },
];

export function RaceWinsTable({ wins }: { wins: PlayerRaceWinRecord[] }) {
  const [q, setQ] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("day");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const summary = useMemo(() => playerRaceWinsSummary(wins), [wins]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return wins.filter((w) => {
      if (
        needle &&
        !`${w.raceName} ${w.horseName} ${w.track ?? ""}`.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (gradeFilter === "graded" && !w.grade) return false;
      if (gradeFilter === "G1" && w.grade !== "G1") return false;
      if (gradeFilter === "G2" && w.grade !== "G2") return false;
      if (gradeFilter === "G3" && w.grade !== "G3") return false;
      if (gradeFilter === "ungraded" && w.grade) return false;
      return true;
    });
  }, [wins, q, gradeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "day") cmp = a.day - b.day;
      else if (sortKey === "payout") cmp = a.payout - b.payout;
      else if (sortKey === "beyer") cmp = (a.beyer ?? -1) - (b.beyer ?? -1);
      else if (sortKey === "raceName") cmp = a.raceName.localeCompare(b.raceName);
      else if (sortKey === "horseName") cmp = a.horseName.localeCompare(b.horseName);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "raceName" || key === "horseName" ? "asc" : "desc");
    }
  }

  if (wins.length === 0) {
    return (
      <div className="rounded-md border border-white/5 bg-slate-900/40 p-8 text-center text-sm text-cream-muted">
        <Trophy className="mx-auto mb-2 h-8 w-8 text-cream-muted/40" />
        You haven&apos;t won any races yet. Enter your horses in races to earn prize money and track
        your victories here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Races Won"
          value={String(summary.totalWins)}
          sub={summary.gradedWins > 0 ? `${summary.gradedWins} graded stakes` : "Career victories"}
        />
        <StatCard
          label="Racing Earnings"
          value={formatCurrency(summary.totalEarnings)}
          sub="Total purse won"
        />
        <StatCard
          label="Top Payout"
          value={formatCurrency(summary.topPayout)}
          sub="Highest single win"
        />
        <StatCard
          label="Average Payout"
          value={formatCurrency(summary.averagePayout)}
          sub="Per victory"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/5 bg-slate-900/40 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search race, horse, or track"
            aria-label="Search race wins"
            className="pl-8"
          />
        </div>
        <PillToggleGroup
          label="Grade"
          options={GRADE_FILTERS.map((g) => ({ value: g, label: g }))}
          value={gradeFilter}
          onChange={(v) => setGradeFilter(v as GradeFilter)}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-md border border-white/5 bg-slate-900/40 p-8 text-center text-sm text-cream-muted">
          No race wins match your filter criteria.
        </div>
      ) : (
        <div className="rounded-md border border-white/5 bg-slate-900/40 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead
                  aria-sort={
                    sortKey === "day" ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("day")}
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide transition-colors hover:text-cream ${
                      sortKey === "day" ? "text-cream" : "text-cream-muted"
                    }`}
                  >
                    Day
                    {sortKey === "day" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortKey === "raceName"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("raceName")}
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide transition-colors hover:text-cream ${
                      sortKey === "raceName" ? "text-cream" : "text-cream-muted"
                    }`}
                  >
                    Race
                    {sortKey === "raceName" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortKey === "horseName"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("horseName")}
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide transition-colors hover:text-cream ${
                      sortKey === "horseName" ? "text-cream" : "text-cream-muted"
                    }`}
                  >
                    Horse
                    {sortKey === "horseName" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
                <TableHead className="text-left">Conditions</TableHead>
                <TableHead
                  className="text-right"
                  aria-sort={
                    sortKey === "beyer" ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("beyer")}
                    className={`inline-flex items-center justify-end w-full gap-1 text-[10px] font-black uppercase tracking-wide transition-colors hover:text-cream ${
                      sortKey === "beyer" ? "text-cream" : "text-cream-muted"
                    }`}
                  >
                    Beyer
                    {sortKey === "beyer" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
                <TableHead
                  className="text-right"
                  aria-sort={
                    sortKey === "payout" ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("payout")}
                    className={`inline-flex items-center justify-end w-full gap-1 text-[10px] font-black uppercase tracking-wide transition-colors hover:text-cream ${
                      sortKey === "payout" ? "text-cream" : "text-cream-muted"
                    }`}
                  >
                    Payout
                    {sortKey === "payout" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const conditions = [r.distance ? `${r.distance}m` : null, r.surface, r.track]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <TableRow key={r.id} className="border-white/5">
                    <TableCell className="text-cream-muted tabular-nums">{r.day}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.raceId ? (
                          <Link
                            to="/race/$raceId"
                            params={{ raceId: r.raceId }}
                            search={{ phase: "review" }}
                            className="font-medium text-cream hover:text-primary underline-offset-2 hover:underline"
                          >
                            {r.raceName}
                          </Link>
                        ) : (
                          <span className="font-medium text-cream">{r.raceName}</span>
                        )}
                        {r.grade && (
                          <Badge
                            variant="outline"
                            className={`px-1.5 py-0 text-[10px] font-bold ${gradeColor(r.grade)}`}
                          >
                            {r.grade}
                          </Badge>
                        )}
                        {!r.grade && r.raceClass && (
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] text-cream-muted border-white/10"
                          >
                            {r.raceClass}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: r.horseId }}
                        className="font-medium text-cream hover:text-primary underline-offset-2 hover:underline"
                      >
                        {r.horseName}
                      </Link>
                      {r.jockeyName && (
                        <div className="text-[10px] text-cream-muted">
                          {r.jockeyId ? (
                            <Link
                              to="/jockey/$jockeyId"
                              params={{ jockeyId: r.jockeyId }}
                              className="hover:text-cream underline-offset-2 hover:underline"
                            >
                              Ridden by {r.jockeyName}
                            </Link>
                          ) : (
                            `Ridden by ${r.jockeyName}`
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-cream-muted">{conditions || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-cream">
                      {r.beyer !== undefined ? r.beyer : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="block font-semibold text-emerald-400">
                        {formatCurrency(r.payout)}
                      </span>
                      {r.purse && r.purse > r.payout && (
                        <span className="block text-[10px] text-cream-muted">
                          of {formatCurrency(r.purse)} purse
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
