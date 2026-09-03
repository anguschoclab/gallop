import { ArrowDown, ArrowUp, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/core/common/formatting";
import { PRESTIGE_TIER_LABELS } from "@/core/prestige/prestigeTypes";
import type { PortfolioSortKey, StablePortfolio } from "@/core/stable/portfolio";

const COLUMNS: { key: PortfolioSortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Stable", numeric: false },
  { key: "cash", label: "Cash", numeric: true },
  { key: "horseCount", label: "Horses", numeric: true },
  { key: "horseValue", label: "Bloodstock", numeric: true },
  { key: "syndicateValue", label: "Syndicate Stakes", numeric: true },
  { key: "prestige", label: "Prestige", numeric: true },
  { key: "lifetimeEarnings", label: "Earnings", numeric: true },
  { key: "netWorth", label: "Net Worth", numeric: true },
];

export function PortfolioTable({
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: StablePortfolio[];
  sortKey: PortfolioSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: PortfolioSortKey) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-white/5 bg-slate-900/40 p-8 text-center text-sm text-cream-muted">
        No stables match these filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/5 bg-slate-900/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5">
            {COLUMNS.map((c) => (
              <TableHead
                key={c.key}
                className={c.numeric ? "text-right" : "text-left"}
                aria-sort={
                  sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => onSort(c.key)}
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors hover:text-cream ${
                    sortKey === c.key ? "text-cream" : "text-cream-muted"
                  } ${c.numeric ? "justify-end w-full" : ""}`}
                >
                  {c.label}
                  {sortKey === c.key &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              className={`border-white/5 ${r.isPlayer ? "bg-primary/5" : ""}`}
            >
              <TableCell className="min-w-[200px]">
                <div className="flex items-center gap-2">
                  {r.isPlayer && <Crown className="h-3.5 w-3.5 text-gold shrink-0" />}
                  {r.isPlayer ? (
                    <span className="font-semibold text-cream">{r.name}</span>
                  ) : (
                    <Link
                      to="/npc-stables/$stableId"
                      params={{ stableId: r.id }}
                      className="font-semibold text-cream hover:text-primary transition-colors"
                    >
                      {r.name}
                    </Link>
                  )}
                  {!r.isPlayer && (
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {r.tier}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-cream-muted truncate">
                  {r.owner}
                  {r.country ? ` · ${r.country}` : ""}
                  {r.topHorseName ? ` · Top: ${r.topHorseName}` : ""}
                </p>
              </TableCell>
              <TableCell className="text-right tabular-nums text-cream">
                {formatCurrency(r.cash)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-cream">
                {r.horseCount}
                <span className="block text-[10px] text-cream-muted">
                  {r.broodmares} mares · {r.stallions} studs
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-cream">
                {formatCurrency(r.horseValue)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-cream">
                {formatCurrency(r.syndicateValue)}
                <span className="block text-[10px] text-cream-muted">
                  {r.syndicateShares} sh · {r.syndicateCount} synd
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="tabular-nums text-cream">{r.prestige}</span>
                <span className="block text-[10px] text-cream-muted">
                  {PRESTIGE_TIER_LABELS[r.prestigeTier]}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-cream-muted">
                {formatCurrency(r.lifetimeEarnings)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-cream">
                {formatCurrency(r.netWorth)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
